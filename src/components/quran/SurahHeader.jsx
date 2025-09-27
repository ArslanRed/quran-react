import React from 'react';

const SurahHeader = ({ surahData }) => {
  if (!surahData) {
    return (
      <div className="surah-header">
        <div className="surah-name">اختر سورة للقراءة</div>
        <div className="surah-info">استخدم القائمة أعلاه لاختيار السورة</div>
      </div>
    );
  }

  const getSurahType = () => {
    return surahData.revelationType === 'Meccan' ? 'مكية' : 'مدنية';
  };

  const shouldShowBismillah = () => {
    // Don't show Bismillah for Surah At-Tawbah (9) as it doesn't start with Bismillah
    return surahData.number !== 9;
  };

  return (
    <div className="surah-header">
      <div className="surah-name">
        سورة {surahData.name}
      </div>
      <div className="surah-info">
        {getSurahType()} - {surahData.numberOfAyahs} آية
      </div>
      {shouldShowBismillah() && (
        <div className="bismillah">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
      )}
    </div>
  );
};

export default SurahHeader;