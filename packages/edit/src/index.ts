/**
 * @module @cgx/edit
 *
 * Cgx 要素编辑工具集（L3 Feature API）
 *
 * 提供顶点拖动、插入、删除、批量平移/旋转/缩放等编辑操作，
 * 所有变更通过 @cgx/history Command 实现 undo/redo。
 *
 * @example
 * ```ts
 * import { createHistory } from '@cgx/history';
 * import { createFeatureEditor } from '@cgx/edit';
 *
 * const history = createHistory({ data: null });
 * const editor = createFeatureEditor({
 *   history,
 *   features: [{ id: 'f1', kind: 'polygon', vertices: [...] }],
 * });
 *
 * editor.select('f1');
 * editor.translate(10, 20);
 * await editor.undo(); // 撤销平移
 * ```
 */

export { createFeatureEditor } from './FeatureEditor.js';

export type {
  Editor,
  EditorState,
  EditorEvents,
  EditorOptions,
  EditableFeature,
  FeatureSnapshot,
  EditDiffEvent,
} from './types.js';
