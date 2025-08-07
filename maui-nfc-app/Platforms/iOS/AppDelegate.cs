using Foundation;
using UIKit;
using Microsoft.Maui;
using Plugin.NFC;

namespace MauiNfcApp.Platforms.iOS;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool FinishedLaunching(UIApplication application, NSDictionary launchOptions)
    {
        // NFC plugin'ini başlat
        try
        {
            CrossNFC.Init();
            System.Diagnostics.Debug.WriteLine("✅ iOS NFC plugin başlatıldı");
        }
        catch (System.Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ iOS NFC plugin başlatma hatası: {ex.Message}");
        }

        return base.FinishedLaunching(application, launchOptions);
    }

    public override void OnActivated(UIApplication application)
    {
        base.OnActivated(application);
        
        // Uygulama aktif olduğunda NFC durumunu kontrol et
        CheckNfcAvailability();
    }

    private void CheckNfcAvailability()
    {
        try
        {
            if (CrossNFC.IsSupported)
            {
                System.Diagnostics.Debug.WriteLine("✅ NFC destekleniyor");
                
                if (CrossNFC.Current.IsAvailable)
                {
                    System.Diagnostics.Debug.WriteLine("✅ NFC kullanılabilir");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("⚠️ NFC destekleniyor ama şu anda kullanılamıyor");
                }
            }
            else
            {
                System.Diagnostics.Debug.WriteLine("❌ Bu cihaz NFC desteklemiyor");
            }
        }
        catch (System.Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ NFC kontrol hatası: {ex.Message}");
        }
    }

    public override void WillEnterForeground(UIApplication application)
    {
        base.WillEnterForeground(application);
        
        // Uygulama ön plana geldiğinde NFC'yi yeniden kontrol et
        CheckNfcAvailability();
    }
}
