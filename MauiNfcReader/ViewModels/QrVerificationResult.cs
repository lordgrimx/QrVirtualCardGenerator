namespace MauiNfcReader.ViewModels;

public class QrVerificationResult
{
    public bool Valid { get; set; }
    public string? Error { get; set; }
    public string? MemberId { get; set; }
    public string? MembershipId { get; set; }
    public string? Name { get; set; }
    public string? Status { get; set; }
}


