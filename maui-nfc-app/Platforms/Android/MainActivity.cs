using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.Nfc;
using Android.OS;
using Microsoft.Maui;
using Plugin.NFC;

namespace MauiNfcApp.Platforms.Android;

[Activity(
    Theme = "@style/Maui.SplashTheme", 
    MainLauncher = true, 
    ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density,
    LaunchMode = LaunchMode.SingleTop,
    Exported = true)]
[IntentFilter(new[] { NfcAdapter.ActionNdefDiscovered }, Categories = new[] { Intent.CategoryDefault }, DataMimeType = "text/plain")]
[IntentFilter(new[] { NfcAdapter.ActionTagDiscovered }, Categories = new[] { Intent.CategoryDefault })]
[IntentFilter(new[] { NfcAdapter.ActionTechDiscovered }, Categories = new[] { Intent.CategoryDefault })]
public class MainActivity : MauiAppCompatActivity
{
    private NfcAdapter? _nfcAdapter;
    private PendingIntent? _pendingIntent;

    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);

        // NFC adaptörünü başlat
        InitializeNfc();

        // Plugin.NFC'yi başlat
        CrossNFC.Init(this);
    }

    private void InitializeNfc()
    {
        try
        {
            _nfcAdapter = NfcAdapter.GetDefaultAdapter(this);
            
            if (_nfcAdapter == null)
            {
                System.Diagnostics.Debug.WriteLine("❌ NFC adaptörü bulunamadı");
                return;
            }

            if (!_nfcAdapter.IsEnabled)
            {
                System.Diagnostics.Debug.WriteLine("⚠️ NFC devre dışı");
                return;
            }

            // PendingIntent oluştur - NFC tag'i okunduğunda tetiklenecek
            var intent = new Intent(this, GetType()).AddFlags(ActivityFlags.SingleTop);
            _pendingIntent = PendingIntent.GetActivity(this, 0, intent, PendingIntentFlags.Mutable);

            System.Diagnostics.Debug.WriteLine("✅ NFC başarıyla başlatıldı");
        }
        catch (System.Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ NFC başlatma hatası: {ex.Message}");
        }
    }

    protected override void OnResume()
    {
        base.OnResume();

        try
        {
            if (_nfcAdapter != null && _pendingIntent != null)
            {
                // NFC foreground dispatch'i etkinleştir
                var intentFilters = new IntentFilter[]
                {
                    new IntentFilter(NfcAdapter.ActionNdefDiscovered),
                    new IntentFilter(NfcAdapter.ActionTagDiscovered),
                    new IntentFilter(NfcAdapter.ActionTechDiscovered)
                };

                var techLists = new string[][]
                {
                    new string[] { "android.nfc.tech.Ndef" },
                    new string[] { "android.nfc.tech.NdefFormatable" },
                    new string[] { "android.nfc.tech.NfcA" },
                    new string[] { "android.nfc.tech.NfcB" },
                    new string[] { "android.nfc.tech.NfcF" },
                    new string[] { "android.nfc.tech.NfcV" },
                    new string[] { "android.nfc.tech.MifareClassic" },
                    new string[] { "android.nfc.tech.MifareUltralight" }
                };

                _nfcAdapter.EnableForegroundDispatch(this, _pendingIntent, intentFilters, techLists);
                System.Diagnostics.Debug.WriteLine("✅ NFC foreground dispatch etkinleştirildi");
            }
        }
        catch (System.Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ NFC foreground dispatch hatası: {ex.Message}");
        }
    }

    protected override void OnPause()
    {
        base.OnPause();

        try
        {
            if (_nfcAdapter != null)
            {
                _nfcAdapter.DisableForegroundDispatch(this);
                System.Diagnostics.Debug.WriteLine("✅ NFC foreground dispatch devre dışı bırakıldı");
            }
        }
        catch (System.Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ NFC foreground dispatch kapatma hatası: {ex.Message}");
        }
    }

    protected override void OnNewIntent(Intent? intent)
    {
        base.OnNewIntent(intent);

        if (intent == null) return;

        try
        {
            // NFC intent'ini işle
            HandleNfcIntent(intent);
        }
        catch (System.Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"❌ NFC intent işleme hatası: {ex.Message}");
        }
    }

    private void HandleNfcIntent(Intent intent)
    {
        var action = intent.Action;
        
        System.Diagnostics.Debug.WriteLine($"📱 NFC Intent alındı: {action}");

        if (NfcAdapter.ActionNdefDiscovered.Equals(action) ||
            NfcAdapter.ActionTagDiscovered.Equals(action) ||
            NfcAdapter.ActionTechDiscovered.Equals(action))
        {
            // Tag'i al
            var tag = intent.GetParcelableExtra(NfcAdapter.ExtraTag) as Android.Nfc.Tag;
            
            if (tag != null)
            {
                System.Diagnostics.Debug.WriteLine($"🏷️ NFC Tag okundu: {BitConverter.ToString(tag.GetId())}");
                
                // Plugin.NFC'ye tag'i gönder
                CrossNFC.OnTagDetected?.Invoke(tag);
            }
        }
    }

    public override void OnRequestPermissionsResult(int requestCode, string[] permissions, Permission[] grantResults)
    {
        base.OnRequestPermissionsResult(requestCode, permissions, grantResults);
        
        // NFC izinleri kontrolü
        if (requestCode == 1)
        {
            if (grantResults.Length > 0 && grantResults[0] == Permission.Granted)
            {
                System.Diagnostics.Debug.WriteLine("✅ NFC izinleri verildi");
            }
            else
            {
                System.Diagnostics.Debug.WriteLine("❌ NFC izinleri reddedildi");
            }
        }
    }
}
