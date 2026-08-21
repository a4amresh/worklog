import type { WorklogStore } from './store';
import type { WorklogTreeProvider } from './treeProvider';

export interface WorklogStoreHandle {
  store: WorklogStore;
  treeProvider: WorklogTreeProvider;
}
