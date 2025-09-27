import React from 'react';
import { useLocalStorage } from '../../hooks';
import { STORAGE_KEYS } from '../../utils/constants';

const BookmarksPage = ({ showNotification }) => {
  const [bookmarks, setBookmarks] = useLocalStorage(STORAGE_KEYS.bookmarks, []);

  const deleteBookmark = (bookmarkId) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    setBookmarks(updatedBookmarks);
    showNotification('تم حذف المرجعية', 'info');
  };

  const navigateToVerse = (surah, verse) => {
    // This would typically trigger navigation in the parent app
    // For now, we'll show a notification
    showNotification(`الانتقال إلى سورة ${surah} آية ${verse}`, 'info');
    // In a real app, this would call a callback prop to switch to Quran page
    // and navigate to the specific verse
  };

  const sortedBookmarks = bookmarks.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bookmarks-page active">
      <h2 className="page-title">المرجعيات المحفوظة</h2>
      
      <div className="bookmarks-grid">
        {sortedBookmarks.length === 0 ? (
          <p>لا توجد مرجعيات محفوظة بعد</p>
        ) : (
          sortedBookmarks.map((bookmark) => (
            <div 
              key={bookmark.id} 
              className="bookmark-item"
              onClick={() => navigateToVerse(bookmark.surah, bookmark.verse)}
            >
              <button 
                className="delete-bookmark" 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBookmark(bookmark.id);
                }}
                title="حذف المرجعية"
              >
                ×
              </button>
              
              <div className="bookmark-reference">
                سورة {bookmark.surah} - آية {bookmark.verse}
              </div>
              
              <div className="bookmark-text">
                {bookmark.arabicText}
              </div>
              
              {bookmark.translationText && (
                <div className="bookmark-translation">
                  {bookmark.translationText}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;