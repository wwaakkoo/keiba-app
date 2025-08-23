const fs = require('fs');
const path = require('path');

// 未使用インポートを削除するファイルとインポートのマッピング
const filesToFix = [
  {
    file: 'src/services/detailedAnalysisService.ts',
    removeImports: ['AccuracyStats', 'ConditionStats', 'TrendData'],
    addUnderscores: [
      { line: 273, var: 'predictions' },
      { line: 274, var: 'investmentMap' },
      { line: 285, var: 'predictions' },
      { line: 286, var: 'investmentMap' },
      { line: 417, var: 'predictions' },
      { line: 418, var: 'investments' },
    ]
  },
  {
    file: 'src/services/enhancedStatisticsService.ts',
    addUnderscores: [
      { line: 175, var: 'investments' },
      { line: 377, var: 'investments' },
      { line: 411, var: 'predictions' },
    ]
  },
  {
    file: 'src/services/investmentPerformanceService.ts',
    removeImports: ['InvestmentPerformance']
  },
  {
    file: 'src/services/performanceAnalysisService.ts',
    removeImports: ['AccuracyStats', 'ConditionStats', 'investmentPerformanceService']
  }
];

// 各ファイルを処理
filesToFix.forEach(({ file, removeImports = [], addUnderscores = [] }) => {
  const filePath = path.join(__dirname, file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 未使用インポートを削除
    if (removeImports.length > 0) {
      removeImports.forEach(importName => {
        // import文から該当のインポートを削除
        content = content.replace(new RegExp(`\\s*,?\\s*${importName}\\s*,?`, 'g'), '');
        content = content.replace(new RegExp(`import\\s*{\\s*,`, 'g'), 'import { ');
        content = content.replace(new RegExp(`,\\s*}`, 'g'), ' }');
      });
    }
    
    // 変数名にアンダースコアを追加（簡単な方法）
    addUnderscores.forEach(({ var: varName }) => {
      // destructuringや宣言での変数名を置換
      content = content.replace(
        new RegExp(`(\\s+${varName})[,\\s]`, 'g'), 
        `$1_${varName},`
      );
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
    
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Unused variable fixes completed');