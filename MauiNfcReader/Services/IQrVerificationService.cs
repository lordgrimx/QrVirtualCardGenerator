using MauiNfcReader.ViewModels;

namespace MauiNfcReader.Services;

public interface IQrVerificationService
{
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyOfflineAsync(string qrData, CancellationToken ct = default);
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyOnlineAsync(string qrData, CancellationToken ct = default);
}


