import { PredictionResult, ActualResult } from '@/types/prediction';
import { Investment } from '@/types/investment';

export class TestDataGenerator {
  /**
   * テスト用の予想データを生成
   */
  static generateTestPredictions(count: number = 20): PredictionResult[] {
    const venues = ['東京', '中山', '阪神', '京都', '中京', '新潟'];
    const surfaces: ('turf' | 'dirt')[] = ['turf', 'dirt'];
    const distances = [1200, 1400, 1600, 1800, 2000, 2400];
    
    return Array.from({ length: count }, (_, i) => {
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const surface = surfaces[Math.floor(Math.random() * surfaces.length)];
      const distance = distances[Math.floor(Math.random() * distances.length)];
      const raceNumber = Math.floor(Math.random() * 12) + 1;
      
      // 予想馬を生成
      const horseCount = Math.floor(Math.random() * 8) + 8; // 8-15頭
      const predictions = Array.from({ length: 3 }, (_, j) => ({
        horse: {
          name: `テスト馬${i}-${j + 1}`,
          number: j + 1,
          jockey: `騎手${j + 1}`,
          popularity: j + 1,
          odds: Math.random() * 20 + 1.5
        },
        scores: {
          speed: Math.random() * 100,
          recent: Math.random() * 100,
          odds: Math.random() * 100,
          total: Math.random() * 100
        },
        speedIndex: Math.random() * 100,
        recentForm: ['◎', '○', '▲', '△', '×'][Math.floor(Math.random() * 5)],
        confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any
      }));

      // 実際の結果を生成（70%の確率で結果入力済み）
      const isResultEntered = Math.random() < 0.7;
      let actualResults: ActualResult[] | null = null;
      
      if (isResultEntered) {
        actualResults = Array.from({ length: horseCount }, (_, j) => ({
          number: j + 1,
          rank: j + 1,
          time: 60 + Math.random() * 30,
          margin: j === 0 ? '' : `${(Math.random() * 5).toFixed(1)}`
        }));
        // ランダムにシャッフル
        actualResults.sort(() => Math.random() - 0.5);
      }

      const date = new Date();
      date.setDate(date.getDate() - i);

      return {
        id: `test-prediction-${i}`,
        date: date.toISOString().split('T')[0],
        race: {
          venue,
          raceNumber,
          distance,
          surface,
          raceDate: date.toISOString().split('T')[0]
        },
        predictions,
        horseCount,
        confidenceLevel: {
          overall: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
          topPick: Math.random() * 100,
          spread: Math.random() * 50,
          dataQuality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any
        },
        actualResults,
        payoutData: null,
        isResultEntered
      };
    });
  }

  /**
   * テスト用の投資データを生成
   */
  static generateTestInvestments(predictions: PredictionResult[]): Investment[] {
    const betTypes = ['win', 'place', 'exacta', 'quinella', 'trifecta'];
    const investments: Investment[] = [];

    predictions.forEach(pred => {
      if (pred.isResultEntered && Math.random() < 0.8) { // 80%の確率で投資
        const betType = betTypes[Math.floor(Math.random() * betTypes.length)];
        const amount = Math.floor(Math.random() * 5000) + 1000; // 1000-6000円
        const odds = pred.predictions[0].horse.odds || 3.0;
        
        // 的中判定（30%の確率で的中）
        const isHit = Math.random() < 0.3;
        const payout = isHit ? Math.floor(amount * odds) : 0;
        const profit = payout - amount;

        investments.push({
          id: `test-investment-${pred.id}`,
          predictionId: pred.id,
          amount,
          betType: betType as any,
          selections: [pred.predictions[0].horse.number],
          odds,
          payout,
          profit,
          timestamp: pred.date,
          raceInfo: {
            venue: pred.race.venue,
            raceNumber: pred.race.raceNumber,
            date: pred.race.raceDate
          }
        });
      }
    });

    return investments;
  }

  /**
   * テストデータをローカルストレージに保存
   */
  static saveTestDataToLocalStorage(): void {
    const predictions = this.generateTestPredictions(50);
    const investments = this.generateTestInvestments(predictions);

    localStorage.setItem('test-predictions', JSON.stringify(predictions));
    localStorage.setItem('test-investments', JSON.stringify(investments));
    
    console.log('テストデータを生成しました:');
    console.log(`- 予想データ: ${predictions.length}件`);
    console.log(`- 投資データ: ${investments.length}件`);
  }

  /**
   * テストデータをローカルストレージから読み込み
   */
  static loadTestDataFromLocalStorage(): {
    predictions: PredictionResult[];
    investments: Investment[];
  } {
    const predictionsData = localStorage.getItem('test-predictions');
    const investmentsData = localStorage.getItem('test-investments');

    return {
      predictions: predictionsData ? JSON.parse(predictionsData) : [],
      investments: investmentsData ? JSON.parse(investmentsData) : []
    };
  }

  /**
   * テストデータをクリア
   */
  static clearTestData(): void {
    localStorage.removeItem('test-predictions');
    localStorage.removeItem('test-investments');
    console.log('テストデータをクリアしました');
  }
}

// ブラウザのコンソールで使用できるようにグローバルに公開
if (typeof window !== 'undefined') {
  (window as any).TestDataGenerator = TestDataGenerator;
}