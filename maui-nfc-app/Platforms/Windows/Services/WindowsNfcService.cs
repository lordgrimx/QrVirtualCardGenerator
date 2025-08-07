using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace MauiNfcApp.Platforms.Windows.Services;

/// <summary>
/// Windows USB NFC reader service - PCSC Lite wrapper
/// ACR122U, ACR1255U-J1 ve benzer USB NFC okuyucular için
/// </summary>
public class WindowsNfcService : IWindowsNfcService
{
    private readonly ILogger<WindowsNfcService> _logger;
    
    // PCSC Constants
    private const int SCARD_S_SUCCESS = 0x00000000;
    private const int SCARD_SCOPE_USER = 0x00000000;
    private const int SCARD_SHARE_SHARED = 0x00000002;
    private const int SCARD_PROTOCOL_T0 = 0x00000001;
    private const int SCARD_PROTOCOL_T1 = 0x00000002;
    private const int SCARD_LEAVE_CARD = 0x00000000;

    public WindowsNfcService(ILogger<WindowsNfcService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> IsUsbNfcReaderAvailableAsync()
    {
        try
        {
            var readers = await GetAvailableReadersAsync();
            return readers.Any(r => r.IsConnected);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "USB NFC okuyucu kontrol hatası");
            return false;
        }
    }

    public async Task<List<NfcReaderInfo>> GetAvailableReadersAsync()
    {
        var readers = new List<NfcReaderInfo>();
        
        try
        {
            // PCSC context oluştur
            uint hContext = 0;
            var result = SCardEstablishContext(SCARD_SCOPE_USER, IntPtr.Zero, IntPtr.Zero, ref hContext);
            
            if (result != SCARD_S_SUCCESS)
            {
                _logger.LogWarning($"PCSC context oluşturulamadı: 0x{result:X8}");
                return readers;
            }

            try
            {
                // Reader listesini al
                uint dwReaders = 0;
                result = SCardListReaders(hContext, null, null, ref dwReaders);
                
                if (result == SCARD_S_SUCCESS && dwReaders > 0)
                {
                    var readersBuffer = new byte[dwReaders];
                    result = SCardListReaders(hContext, null, readersBuffer, ref dwReaders);
                    
                    if (result == SCARD_S_SUCCESS)
                    {
                        var readerNames = Encoding.ASCII.GetString(readersBuffer).TrimEnd('\0').Split('\0');
                        
                        foreach (var readerName in readerNames.Where(r => !string.IsNullOrEmpty(r)))
                        {
                            var readerInfo = await GetReaderInfoAsync(hContext, readerName);
                            readers.Add(readerInfo);
                        }
                    }
                }
            }
            finally
            {
                SCardReleaseContext(hContext);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reader listesi alma hatası");
        }

        return readers;
    }

    public async Task<WindowsNfcReadResult> ReadCardAsync(string? readerName = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var readers = await GetAvailableReadersAsync();
            var targetReader = !string.IsNullOrEmpty(readerName) 
                ? readers.FirstOrDefault(r => r.Name.Equals(readerName, StringComparison.OrdinalIgnoreCase))
                : readers.FirstOrDefault(r => r.IsConnected);

            if (targetReader == null)
            {
                return new WindowsNfcReadResult
                {
                    Success = false,
                    ErrorMessage = "Uygun NFC okuyucu bulunamadı"
                };
            }

            return await ReadCardFromReaderAsync(targetReader.Name, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart okuma hatası");
            return new WindowsNfcReadResult
            {
                Success = false,
                ErrorMessage = $"Kart okuma hatası: {ex.Message}"
            };
        }
    }

    public async Task<WindowsNfcWriteResult> WriteCardAsync(string data, string? readerName = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var readers = await GetAvailableReadersAsync();
            var targetReader = !string.IsNullOrEmpty(readerName)
                ? readers.FirstOrDefault(r => r.Name.Equals(readerName, StringComparison.OrdinalIgnoreCase))
                : readers.FirstOrDefault(r => r.IsConnected);

            if (targetReader == null)
            {
                return new WindowsNfcWriteResult
                {
                    Success = false,
                    ErrorMessage = "Uygun NFC okuyucu bulunamadı"
                };
            }

            return await WriteCardToReaderAsync(data, targetReader.Name, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart yazma hatası");
            return new WindowsNfcWriteResult
            {
                Success = false,
                ErrorMessage = $"Kart yazma hatası: {ex.Message}"
            };
        }
    }

    public async Task<PcscServiceStatus> GetPcscServiceStatusAsync()
    {
        try
        {
            var readers = await GetAvailableReadersAsync();
            
            return new PcscServiceStatus
            {
                IsRunning = true,
                Status = "Çalışıyor",
                AvailableReaders = readers.Select(r => r.Name).ToArray()
            };
        }
        catch (Exception ex)
        {
            return new PcscServiceStatus
            {
                IsRunning = false,
                Status = "Çalışmıyor",
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<NfcReaderInfo> GetReaderInfoAsync(uint hContext, string readerName)
    {
        var readerInfo = new NfcReaderInfo
        {
            Name = readerName,
            Type = "USB NFC Reader"
        };

        try
        {
            uint hCard = 0;
            uint dwActiveProtocol = 0;
            
            var result = SCardConnect(hContext, readerName, SCARD_SHARE_SHARED,
                SCARD_PROTOCOL_T0 | SCARD_PROTOCOL_T1, ref hCard, ref dwActiveProtocol);

            if (result == SCARD_S_SUCCESS)
            {
                readerInfo.IsConnected = true;
                readerInfo.Status = "Bağlı";
                
                var protocols = new List<string>();
                if ((dwActiveProtocol & SCARD_PROTOCOL_T0) != 0) protocols.Add("T=0");
                if ((dwActiveProtocol & SCARD_PROTOCOL_T1) != 0) protocols.Add("T=1");
                readerInfo.SupportedProtocols = protocols.ToArray();

                SCardDisconnect(hCard, SCARD_LEAVE_CARD);
            }
            else
            {
                readerInfo.IsConnected = false;
                readerInfo.Status = "Bağlantısız";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"Reader bilgisi alma hatası: {readerName}");
            readerInfo.IsConnected = false;
            readerInfo.Status = "Hata";
        }

        return readerInfo;
    }

    private async Task<WindowsNfcReadResult> ReadCardFromReaderAsync(string readerName, CancellationToken cancellationToken)
    {
        uint hContext = 0;
        uint hCard = 0;

        try
        {
            // PCSC context oluştur
            var result = SCardEstablishContext(SCARD_SCOPE_USER, IntPtr.Zero, IntPtr.Zero, ref hContext);
            if (result != SCARD_S_SUCCESS)
            {
                return new WindowsNfcReadResult
                {
                    Success = false,
                    ErrorMessage = $"PCSC context hatası: 0x{result:X8}"
                };
            }

            // Karta bağlan
            uint dwActiveProtocol = 0;
            result = SCardConnect(hContext, readerName, SCARD_SHARE_SHARED,
                SCARD_PROTOCOL_T0 | SCARD_PROTOCOL_T1, ref hCard, ref dwActiveProtocol);

            if (result != SCARD_S_SUCCESS)
            {
                return new WindowsNfcReadResult
                {
                    Success = false,
                    ErrorMessage = $"Kart bağlantı hatası: 0x{result:X8}"
                };
            }

            // NDEF okuma komutu (basitleştirilmiş)
            var readCommand = new byte[] { 0xFF, 0xB0, 0x00, 0x04, 0x10 }; // Read 16 bytes from block 4
            var responseBuffer = new byte[256];
            uint responseLength = (uint)responseBuffer.Length;

            result = SCardTransmit(hCard, IntPtr.Zero, readCommand, (uint)readCommand.Length,
                IntPtr.Zero, responseBuffer, ref responseLength);

            if (result == SCARD_S_SUCCESS && responseLength > 2)
            {
                var statusWord = (responseBuffer[responseLength - 2] << 8) | responseBuffer[responseLength - 1];
                
                if (statusWord == 0x9000) // Success
                {
                    var data = responseBuffer.Take((int)responseLength - 2).ToArray();
                    var dataString = Encoding.UTF8.GetString(data).TrimEnd('\0');

                    return new WindowsNfcReadResult
                    {
                        Success = true,
                        Data = dataString,
                        RawData = data,
                        ReaderName = readerName,
                        CardType = "NTAG"
                    };
                }
            }

            return new WindowsNfcReadResult
            {
                Success = false,
                ErrorMessage = "Kart okuma başarısız",
                ReaderName = readerName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart okuma hatası");
            return new WindowsNfcReadResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                ReaderName = readerName
            };
        }
        finally
        {
            if (hCard != 0) SCardDisconnect(hCard, SCARD_LEAVE_CARD);
            if (hContext != 0) SCardReleaseContext(hContext);
        }
    }

    private async Task<WindowsNfcWriteResult> WriteCardToReaderAsync(string data, string readerName, CancellationToken cancellationToken)
    {
        uint hContext = 0;
        uint hCard = 0;

        try
        {
            var result = SCardEstablishContext(SCARD_SCOPE_USER, IntPtr.Zero, IntPtr.Zero, ref hContext);
            if (result != SCARD_S_SUCCESS)
            {
                return new WindowsNfcWriteResult
                {
                    Success = false,
                    ErrorMessage = $"PCSC context hatası: 0x{result:X8}"
                };
            }

            uint dwActiveProtocol = 0;
            result = SCardConnect(hContext, readerName, SCARD_SHARE_SHARED,
                SCARD_PROTOCOL_T0 | SCARD_PROTOCOL_T1, ref hCard, ref dwActiveProtocol);

            if (result != SCARD_S_SUCCESS)
            {
                return new WindowsNfcWriteResult
                {
                    Success = false,
                    ErrorMessage = $"Kart bağlantı hatası: 0x{result:X8}"
                };
            }

            // Yazma komutu (basitleştirilmiş NDEF yazma)
            var dataBytes = Encoding.UTF8.GetBytes(data);
            var writeCommand = new byte[5 + dataBytes.Length];
            writeCommand[0] = 0xFF; // Class
            writeCommand[1] = 0xD6; // Write command
            writeCommand[2] = 0x00; // P1
            writeCommand[3] = 0x04; // P2 - Block 4
            writeCommand[4] = (byte)dataBytes.Length; // Length
            Array.Copy(dataBytes, 0, writeCommand, 5, dataBytes.Length);

            var responseBuffer = new byte[2];
            uint responseLength = (uint)responseBuffer.Length;

            result = SCardTransmit(hCard, IntPtr.Zero, writeCommand, (uint)writeCommand.Length,
                IntPtr.Zero, responseBuffer, ref responseLength);

            if (result == SCARD_S_SUCCESS && responseLength == 2)
            {
                var statusWord = (responseBuffer[0] << 8) | responseBuffer[1];
                
                if (statusWord == 0x9000)
                {
                    return new WindowsNfcWriteResult
                    {
                        Success = true,
                        BytesWritten = dataBytes.Length,
                        ReaderName = readerName
                    };
                }
            }

            return new WindowsNfcWriteResult
            {
                Success = false,
                ErrorMessage = "Kart yazma başarısız",
                ReaderName = readerName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kart yazma hatası");
            return new WindowsNfcWriteResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                ReaderName = readerName
            };
        }
        finally
        {
            if (hCard != 0) SCardDisconnect(hCard, SCARD_LEAVE_CARD);
            if (hContext != 0) SCardReleaseContext(hContext);
        }
    }

    // PCSC API Imports
    [DllImport("winscard.dll")]
    private static extern uint SCardEstablishContext(uint dwScope, IntPtr pvReserved1, IntPtr pvReserved2, ref uint phContext);

    [DllImport("winscard.dll")]
    private static extern uint SCardReleaseContext(uint hContext);

    [DllImport("winscard.dll", CharSet = CharSet.Auto)]
    private static extern uint SCardListReaders(uint hContext, string? mszGroups, byte[]? mszReaders, ref uint pcchReaders);

    [DllImport("winscard.dll", CharSet = CharSet.Auto)]
    private static extern uint SCardConnect(uint hContext, string szReader, uint dwShareMode, uint dwPreferredProtocols, ref uint phCard, ref uint pdwActiveProtocol);

    [DllImport("winscard.dll")]
    private static extern uint SCardDisconnect(uint hCard, uint dwDisposition);

    [DllImport("winscard.dll")]
    private static extern uint SCardTransmit(uint hCard, IntPtr pioSendPci, byte[] pbSendBuffer, uint cbSendLength, IntPtr pioRecvPci, byte[] pbRecvBuffer, ref uint pcbRecvLength);
}
