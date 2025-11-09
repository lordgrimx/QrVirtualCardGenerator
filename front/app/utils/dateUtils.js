// Türkçe tarih formatlama yardımcı fonksiyonları
// Tüm projede tutarlı Türkçe tarih formatları için kullanılır

// Türkçe ay ve gün isimleri
const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const TURKISH_DAYS = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 
  'Perşembe', 'Cuma', 'Cumartesi'
];

const TURKISH_DAYS_SHORT = [
  'Paz', 'Pzt', 'Sal', 'Çar', 
  'Per', 'Cum', 'Cmt'
];

/**
 * Tarihi Türkçe formatında döndürür
 * @param {Date|string} date - Date objesi veya tarih string'i
 * @param {Object} options - Format seçenekleri
 * @returns {string} Türkçe formatlanmış tarih
 */
export function formatTurkishDate(date, options = {}) {
  const {
    format = 'long', // 'long', 'short', 'numeric'
    includeTime = false,
    includeDay = false
  } = options;

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Geçersiz Tarih';
  }

  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  const dayOfWeek = dateObj.getDay();

  let result = '';

  // Gün ekle
  if (includeDay) {
    result += `${TURKISH_DAYS[dayOfWeek]} `;
  }

  // Tarihi formatla
  switch (format) {
    case 'short':
      result += `${day} ${TURKISH_MONTHS[month].substring(0, 3)} ${year}`;
      break;
    case 'numeric':
      result += `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
      break;
    case 'long':
    default:
      result += `${day} ${TURKISH_MONTHS[month]} ${year}`;
      break;
  }

  // Zaman ekle
  if (includeTime) {
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    result += ` ${hours}:${minutes}`;
  }

  return result;
}

/**
 * Tarihi kısa gün ismiyle formatlar (grafikler için)
 * @param {Date|string} date - Date objesi veya tarih string'i
 * @returns {string} Kısa Türkçe formatlanmış tarih
 */
export function formatTurkishDateShort(date) {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Geçersiz';
  }

  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const dayOfWeek = dateObj.getDay();

  return `${TURKISH_DAYS_SHORT[dayOfWeek]} ${day} ${TURKISH_MONTHS[month].substring(0, 3)}`;
}

/**
 * HTML date input'u için Türkçe locale ile formatlanmış tarih döndürür
 * @param {Date|string} date - Date objesi veya tarih string'i
 * @returns {string} YYYY-MM-DD formatında tarih
 */
export function formatDateForInput(date) {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Göreceli zaman formatı (örn: "2 saat önce", "3 gün önce")
 * @param {Date|string} date - Date objesi veya tarih string'i
 * @returns {string} Göreceli zaman ifadesi
 */
export function formatRelativeTime(date) {
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Az önce';
  } else if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`;
  } else {
    return formatTurkishDate(dateObj, { format: 'numeric' });
  }
}

/**
 * Takvim için Türkçe ay isimleri döndürür
 * @returns {Array} Türkçe ay isimleri
 */
export function getTurkishMonths() {
  return [...TURKISH_MONTHS];
}

/**
 * Takvim için Türkçe gün isimleri döndürür
 * @param {boolean} short - Kısa isimler mi?
 * @returns {Array} Türkçe gün isimleri
 */
export function getTurkishDays(short = false) {
  return short ? [...TURKISH_DAYS_SHORT] : [...TURKISH_DAYS];
}

// Varsayılan export
export default {
  formatTurkishDate,
  formatTurkishDateShort,
  formatDateForInput,
  formatRelativeTime,
  getTurkishMonths,
  getTurkishDays
};