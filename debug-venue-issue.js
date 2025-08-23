// 競馬場表示問題のデバッグスクリプト
// ブラウザのコンソールで実行してください

async function debugVenueIssue() {
  console.log('🔍 競馬場表示問題のデバッグを開始します...');
  
  try {
    // IndexedDBからデータを直接取得
    const request = indexedDB.open('KeibaDatabase');
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      
      // predictionsテーブルからデータを取得
      const transaction = db.transaction(['predictions'], 'readonly');
      const objectStore = transaction.objectStore('predictions');
      const getAllRequest = objectStore.getAll();
      
      getAllRequest.onsuccess = function(event) {
        const predictions = event.target.result;
        console.log('📊 予想データ総数:', predictions.length);
        
        if (predictions.length > 0) {
          console.log('🔍 最新の予想データ5件:');
          predictions.slice(-5).forEach((prediction, index) => {
            console.log(`${index + 1}. ID: ${prediction.id}`);
            console.log(`   タイムスタンプ: ${prediction.timestamp}`);
            console.log(`   レースID: ${prediction.raceId}`);
            console.log(`   race情報:`, prediction.race);
            console.log(`   競馬場: ${prediction.race?.venue || '未設定'}`);
            console.log('   ---');
          });
          
          // 競馬場の分布を確認
          const venueCount = {};
          predictions.forEach(p => {
            const venue = p.race?.venue || '未設定';
            venueCount[venue] = (venueCount[venue] || 0) + 1;
          });
          
          console.log('🏟️ 競馬場の分布:');
          Object.entries(venueCount).forEach(([venue, count]) => {
            console.log(`   ${venue}: ${count}件`);
          });
        }
      };
      
      getAllRequest.onerror = function(event) {
        console.error('❌ データ取得エラー:', event.target.error);
      };
    };
    
    request.onerror = function(event) {
      console.error('❌ データベース接続エラー:', event.target.error);
    };
    
  } catch (error) {
    console.error('❌ デバッグスクリプトエラー:', error);
  }
}

// 実行
debugVenueIssue();