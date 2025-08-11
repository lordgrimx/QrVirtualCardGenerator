using CommunityToolkit.Maui.Views;

namespace MauiNfcReader.Views;

public partial class MemberInfoPopup : Popup
{
    public MemberInfoPopup(MemberInfoPopupViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    private void OnCloseClicked(object? sender, EventArgs e)
    {
        Close();
    }
}

public class MemberInfoPopupViewModel
{
    public string? Status { get; set; }
    public string? Name { get; set; }
    public string? MembershipId { get; set; }
    public string? MemberId { get; set; }
    public string? Mode { get; set; }
    public bool Valid { get; set; }
    public string ValidText => Valid ? "Geçerli" : "Geçersiz";
    
    // NFC-specific ek bilgiler
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Role { get; set; }
    public string? MembershipType { get; set; }
    public string? ExpirationDate { get; set; }
    public string? JoinDate { get; set; }
    public bool FromDatabase { get; set; }
    public string? VerificationTime { get; set; }
    
    // UI gösterim için yardımcı properties
    public bool HasExtendedInfo => !string.IsNullOrEmpty(Email) || !string.IsNullOrEmpty(PhoneNumber);
    public string DatabaseText => FromDatabase ? "Database'den alındı" : "NFC kartından alındı";
    public string ModeWithDatabase => $"{Mode} - {DatabaseText}";
    
    // Individual field visibility properties
    public bool HasEmail => !string.IsNullOrEmpty(Email);
    public bool HasPhoneNumber => !string.IsNullOrEmpty(PhoneNumber);
    public bool HasRole => !string.IsNullOrEmpty(Role);
    public bool HasMembershipType => !string.IsNullOrEmpty(MembershipType);
    public bool HasExpirationDate => !string.IsNullOrEmpty(ExpirationDate);
    public bool HasJoinDate => !string.IsNullOrEmpty(JoinDate);
    public bool HasVerificationTime => !string.IsNullOrEmpty(VerificationTime);
}


