import { ResourceType } from '../core/resource/resourceCore';
import { UnifiedQueryAST, ResourceQuerySource } from '../core/query/queryTypes';
import { SavedViewPresentation, SavedViewV2 } from '../views/savedViewTypes';

export interface ExpectedCollectionProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'relation' | 'formula' | 'rollup';
  required?: boolean;
  options?: string[];
  relationTargetType?: ResourceType;
  formulaExpression?: string;
  rollupConfig?: {
    relationField: string;
    targetField: string;
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  };
}

export interface CollectionV2 {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  targetResourceType: ResourceType;
  schema: {
    expectedProperties: ExpectedCollectionProperty[];
  };
  baseSource: ResourceQuerySource;
  baseQuery: UnifiedQueryAST;
  defaultViewId: string;
  views: SavedViewV2[];
  explicitMemberIds?: string[]; // Stable resource IDs only (no copied data)
  createdAt: number;
  updatedAt: number;
}
