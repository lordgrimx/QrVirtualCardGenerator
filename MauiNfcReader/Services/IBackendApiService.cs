using MauiNfcReader.ViewModels;
using MauiNfcReader.Models;

namespace MauiNfcReader.Services;

public interface IBackendApiService
{
    Task<(bool ok, string? publicKeyPem, string? error)> GetPublicKeyAsync(CancellationToken ct = default);
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyQrAsync(string qrData, CancellationToken ct = default);
    Task<(bool ok, QrVerificationResult? result, string? error)> VerifyAndReadFromServerAsync(CancellationToken ct = default);

    /// <summary>
    /// Üye arama (search query boş ise ilk sayfa)
    /// </summary>
    Task<(bool ok, List<MemberInfo> members, string? error)> SearchMembersAsync(string query, CancellationToken ct = default);
}


