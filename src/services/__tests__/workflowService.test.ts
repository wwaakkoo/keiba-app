/**
 * WorkflowServiceの基本的な動作確認テスト
 */

import { WorkflowService } from '../workflowService';
import { WorkflowPriority } from '@/types/workflow';

// 簡単な動作確認
describe('WorkflowService', () => {
  const workflowService = new WorkflowService();

  test('WorkflowServiceのインスタンスが作成できる', () => {
    expect(workflowService).toBeInstanceOf(WorkflowService);
  });

  test('WorkflowServiceの基本メソッドが存在する', () => {
    expect(typeof workflowService.createWorkflowState).toBe('function');
    expect(typeof workflowService.updateWorkflowState).toBe('function');
    expect(typeof workflowService.getWorkflowStatus).toBe('function');
    expect(typeof workflowService.getIncompleteWorkflows).toBe('function');
    expect(typeof workflowService.createInvestmentFromPrediction).toBe('function');
    expect(typeof workflowService.updateResultsWithWorkflow).toBe('function');
    expect(typeof workflowService.getWorkflowStats).toBe('function');
    expect(typeof workflowService.getWorkflowActivities).toBe('function');
  });

  test('WorkflowPriorityの列挙型が正しく定義されている', () => {
    expect(WorkflowPriority.HIGH).toBe('high');
    expect(WorkflowPriority.MEDIUM).toBe('medium');
    expect(WorkflowPriority.LOW).toBe('low');
  });
});