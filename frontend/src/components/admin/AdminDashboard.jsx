
// components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import adminAPI from '../../services/adminApi';

const AdminDashboard = ({ user, onLogout, showNotification }) => {
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [surahData, setSurahData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    loadSurahs();
  }, []);

  const loadSurahs = async () => {
    try {
      setIsLoading(true);
      const data = await adminAPI.getSurahs();
      setSurahs(data);
    } catch (error) {
      showNotification('Failed to load surahs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSurah = async (surahNumber) => {
    try {
      setIsLoading(true);
      const data = await adminAPI.getSurah(surahNumber);
      setSurahData(data);
      setSelectedSurah(surahNumber);
    } catch (error) {
      showNotification('Failed to load surah', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUpload = async (verseNumber) => {
    if (!uploadFile || !selectedSurah) return;

    try {
      await adminAPI.uploadAudio(selectedSurah, verseNumber, uploadFile);
      showNotification('Audio uploaded successfully!', 'success');
      setUploadFile(null);
      // Reload surah to update audio status
      loadSurah(selectedSurah);
    } catch (error) {
      showNotification(error.message || 'Upload failed', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await adminAPI.logout();
      onLogout();
      showNotification('Logged out successfully', 'success');
    } catch (error) {
      onLogout(); // Logout anyway
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Admin Dashboard</h1>
        <div>
          <span style={{ marginRight: '1rem' }}>Welcome, {user.username}</span>
          <button
            onClick={handleLogout}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Sidebar - Surah List */}
        <div>
          <h3>Surahs</h3>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {surahs.map((surah) => (
                <div
                  key={surah.id}
                  onClick={() => loadSurah(surah.id)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selectedSurah === surah.id ? '#e3f2fd' : 'white'
                  }}
                >
                  <strong>{surah.id}. {surah.name_english}</strong>
                  <br />
                  <small>{surah.name_arabic}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content - Surah Details */}
        <div>
          {surahData ? (
            <div>
              <h2>{surahData.name_english} ({surahData.name_arabic})</h2>
              <p>Verses: {surahData.number_of_ayahs}</p>

              {/* Audio Upload Section */}
              <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <h4>Upload Audio</h4>
                <input
                  type="file"
                  accept="audio/mp3"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={{ marginBottom: '1rem' }}
                />
                {uploadFile && (
                  <p>Selected: {uploadFile.name}</p>
                )}
              </div>

              {/* Verses List */}
              <h4>Verses ({surahData.ayahs?.length || 0})</h4>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {surahData.ayahs?.map((ayah) => (
                  <div
                    key={ayah.number_in_surah}
                    style={{
                      padding: '1rem',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Verse {ayah.number_in_surah}</strong>
                      <div>
                        {ayah.hasAudio ? (
                          <span style={{ color: 'green', marginRight: '1rem' }}>✓ Has Audio</span>
                        ) : (
                          <span style={{ color: 'red', marginRight: '1rem' }}>✗ No Audio</span>
                        )}
                        <button
                          onClick={() => handleAudioUpload(ayah.number_in_surah)}
                          disabled={!uploadFile}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: uploadFile ? '#4CAF50' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: uploadFile ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    <p style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '1.2rem', 
                      textAlign: 'right', 
                      fontFamily: 'Arial, sans-serif' 
                    }}>
                      {ayah.text_arabic}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Select a surah from the sidebar</p>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;