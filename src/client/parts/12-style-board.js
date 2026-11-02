/**
 * Board stylesheet: workspace bar, columns, cards, drop indicators, editor
 * form bits, archive rows and the project-creation dialog. Owns every
 * `kbn-` selector that `10-style-base.js` does not (ARCHITECTURE.md §10).
 *
 * Values follow the running Harness scale (ARCHITECTURE.md §7): radius-lg cards on
 * a module-platform column, 8px status dots, 36px controls, token colors only.
 */
addStyle(`
/* ---------------------------------------------------------------- board region */

.kbn-board-region {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 24px 20px;
  overflow: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}

.kbn-board-region::-webkit-scrollbar { width: 10px; height: 10px; }
.kbn-board-region::-webkit-scrollbar-track { background: transparent; }
.kbn-board-region::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}
.kbn-board-region::-webkit-scrollbar-thumb:hover {
  background: var(--dsw-alias-scrollbar-hover-l2);
  background-clip: content-box;
}

.kbn-board {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(240px, 1fr));
  gap: 14px;
  align-items: stretch;
}

/* Loading / error / empty states fill the region and stay centered. */
.kbn-board-placeholder {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kbn-error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.kbn-error-bar > svg { flex: none; }
.kbn-error-bar > span { flex: 1; min-width: 0; }

/* ---------------------------------------------------------------- workspace bar */

.kbn-ws-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  flex: none;
  padding: 0 24px 14px;
}

.kbn-ws-select { width: 220px; max-width: 42vw; flex: none; }

.kbn-ws-actions { display: inline-flex; align-items: center; gap: 6px; }

/* Badge wrapper for the archive count. */
.kbn-badge-wrap { position: relative; display: inline-flex; flex: none; }

.kbn-chip-count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-label-primary-foreground);
  font-size: 10px;
  line-height: 16px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

/* ----------------------------------------------------------------- columns */

.kbn-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-module-platform);
  padding: 8px 8px 6px;
  transition: background-color .12s var(--ds-ease-in-out), box-shadow .12s var(--ds-ease-in-out);
}

.kbn-col[data-status=todo]  { --kbn-col-tone: var(--dsw-alias-state-idle-primary); }
.kbn-col[data-status=doing] { --kbn-col-tone: var(--dsw-alias-state-business-primary); }
.kbn-col[data-status=done]  { --kbn-col-tone: var(--dsw-alias-state-success-primary); }

.kbn-col[data-drop=true] {
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, transparent);
}

.kbn-col-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 5px 6px;
  margin-bottom: 8px;
  border-radius: var(--dsw-radius-sm);
  background: color-mix(in srgb, var(--kbn-col-tone, var(--dsw-alias-state-idle-primary)) 10%, transparent);
}

.kbn-col-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--kbn-tone, var(--dsw-alias-state-idle-primary));
}
.kbn-col-dot[data-status=todo]  { --kbn-tone: var(--dsw-alias-state-idle-primary); }
.kbn-col-dot[data-status=doing] { --kbn-tone: var(--dsw-alias-state-business-primary); }
.kbn-col-dot[data-status=done]  { --kbn-tone: var(--dsw-alias-state-success-primary); }

.kbn-col-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 22px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-col-count {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  flex: none;
}

.kbn-col-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-col-add:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.kbn-col-add:disabled { opacity: .4; cursor: not-allowed; }

.kbn-col-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}
.kbn-col-body::-webkit-scrollbar { width: 8px; }
.kbn-col-body::-webkit-scrollbar-track { background: transparent; }
.kbn-col-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}
.kbn-col-body::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l2); background-clip: content-box; }

.kbn-col-body.kbn-drop-target {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, transparent);
  border-radius: var(--dsw-radius-md);
}

/* Drop zone outline while a card hovers this column. */
.kbn-col-drop {
  outline: 1.5px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);
  outline-offset: -3px;
  border-radius: var(--dsw-radius-md);
}

.kbn-col-empty {
  margin: 2px 2px 4px;
  padding: 14px 8px;
  border: .5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

/* -------------------------------------------------------------------- cards */

.kbn-card-slot { display: block; min-width: 0; }

.kbn-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  cursor: grab;
  transition: background-color .15s var(--ds-ease-in-out), border-color .15s var(--ds-ease-in-out), box-shadow .15s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out);
}
.kbn-card:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l3);
}
.kbn-card[data-dragging=true] { opacity: .55; cursor: grabbing; }

.kbn-card-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

/* Urgency chip: text always written, tone from the status scale (ARCHITECTURE.md §7). */
.kbn-priority {
  flex: none;
  height: 22px;
  padding: 0 8px;
  gap: 3px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 17px;
}
.kbn-priority[data-tone=neutral] {
  background: color-mix(in srgb, var(--dsw-alias-state-idle-primary) 12%, transparent);
  color: var(--dsw-alias-state-idle-primary);
}
.kbn-priority[data-tone=brand] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
  color: var(--dsw-alias-state-business-primary);
}
.kbn-priority[data-tone=warn] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}
.kbn-priority[data-tone=danger] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
}

.kbn-card-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 22px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kbn-card-desc {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kbn-card-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
}

.kbn-card-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.kbn-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  max-width: 100%;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kbn-tag-more { color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }

.kbn-dates {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.kbn-card-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.kbn-card-date > svg { flex: none; }
.kbn-card-date[data-overdue=true] { color: var(--dsw-alias-state-error-primary); }
.kbn-card-date[data-soon=true] { color: var(--dsw-alias-state-warn-primary); }

.kbn-card-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-top: 2px;
}

.kbn-assignee {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 55%;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-assignee > svg { flex: none; }
.kbn-assignee[data-kind=ai] > svg { color: var(--dsw-alias-brand-primary); }
.kbn-assignee[data-kind=human] > svg { color: var(--dsw-alias-label-tertiary); }
.kbn-assignee-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-attach-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}
.kbn-attach-count > svg { flex: none; }

.kbn-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-status-text { white-space: nowrap; }

.kbn-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex: none;
  opacity: 0;
  transition: opacity .12s var(--ds-ease-in-out);
}
.kbn-card:hover .kbn-card-actions,
.kbn-card:focus-within .kbn-card-actions { opacity: 1; }

.kbn-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-card-action:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.kbn-card-action:disabled { opacity: .4; cursor: not-allowed; }

/* ----------------------------------------------------------- drop indicator */

.kbn-drop-line {
  height: 2px;
  margin: 2px 0;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);
  pointer-events: none;
}

/* ------------------------------------------------------------ task editor */

.kbn-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.kbn-editor-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-sm);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.kbn-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.kbn-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.kbn-form-row[data-span=full] { grid-column: 1 / -1; }

.kbn-tag-input {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 36px;
  padding: 5px 8px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  cursor: text;
  transition: border-color .12s var(--ds-ease-in-out), box-shadow .12s var(--ds-ease-in-out);
}
.kbn-tag-input:focus-within {
  border-color: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)) 18%, transparent);
}

.kbn-tag-field {
  flex: 1;
  min-width: 90px;
  height: 24px;
  padding: 2px 4px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}
.kbn-tag-field::placeholder { color: var(--dsw-alias-label-tertiary); opacity: 1; }

.kbn-tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 22px;
  max-width: 100%;
  padding: 0 2px 0 8px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-tag-pill > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-tag-x,
.kbn-attach-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  flex: none;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-tag-x:hover,
.kbn-attach-x:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-state-error-primary);
}
.kbn-attach-x { width: 20px; height: 20px; }

.kbn-attach-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.kbn-attach-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 4px 8px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.kbn-attach-item > svg { flex: none; color: var(--dsw-alias-label-tertiary); }

.kbn-attach-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-attach-size {
  flex: none;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.kbn-attach-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: .5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), border-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-attach-add:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.kbn-attach-add:disabled { opacity: .4; cursor: not-allowed; }
.kbn-attach-add > svg { flex: none; }

.kbn-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-module-platform);
  align-self: flex-start;
}

.kbn-seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-seg-btn > svg { flex: none; }
.kbn-seg-btn:hover { color: var(--dsw-alias-label-primary); }
.kbn-seg-btn[aria-pressed=true] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 0 0 .5px var(--dsw-alias-border-l3);
}

/* --------------------------------------------------------------- archive */

.kbn-archive {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.kbn-archive-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.kbn-archive-group-title {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px 2px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
}
.kbn-archive-group-title > svg { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-archive-group-title > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-archive-ws {
  margin-left: 4px;
  color: var(--dsw-alias-label-caption);
  font-size: 12px;
  line-height: 18px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-archive-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  transition: background-color .12s var(--ds-ease-in-out), border-color .12s var(--ds-ease-in-out);
}
.kbn-archive-row:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
}

.kbn-archive-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.kbn-archive-title {
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}

.kbn-archive-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.kbn-archive-meta > span { display: inline-flex; align-items: center; gap: 3px; }
.kbn-archive-meta > span > svg { flex: none; }

.kbn-archive-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

/* ------------------------------------------------------- project creation */

.kbn-project-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.kbn-dir-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}

.kbn-dir-value {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  transition: border-color .12s var(--ds-ease-in-out);
}
.kbn-dir-value:hover { border-color: var(--dsw-alias-border-l2); }
.kbn-dir-value[data-empty=true] { color: var(--dsw-alias-label-tertiary); }
.kbn-dir-value > svg { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-dir-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -------------------------------------------------- focus + reduced motion */

.kbn-root .kbn-col-add:focus-visible,
.kbn-root .kbn-card-action:focus-visible,
.kbn-root .kbn-tag-x:focus-visible,
.kbn-root .kbn-attach-x:focus-visible,
.kbn-root .kbn-attach-add:focus-visible,
.kbn-root .kbn-seg-btn:focus-visible,
.kbn-root .kbn-dir-value:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .kbn-board-region { overflow-y: auto; }
  .kbn-board {
    flex: none;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }
  .kbn-col { max-height: none; }
  .kbn-col-body { overflow: visible; }
}

@media (hover: none) {
  .kbn-card-actions { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .kbn-col,
  .kbn-card,
  .kbn-card-actions,
  .kbn-card-action,
  .kbn-col-add,
  .kbn-tag-input,
  .kbn-tag-x,
  .kbn-attach-x,
  .kbn-attach-add,
  .kbn-seg-btn,
  .kbn-dir-value,
  .kbn-archive-row {
    transition: none;
  }
}
`);


// Workbench: the three status columns stay put on the left, one task-detail
// sheet sits at the far right in a deliberately different form (single neutral
// surface with divided sections instead of coloured columns and cards).
addStyle(`
.kbn-workbench {
  display: flex;
  gap: 14px;
  flex: 1;
  min-height: 0;
  padding: 0 24px 18px;
  box-sizing: border-box;
}
.kbn-workbench .kbn-board-region { padding: 0; }
.kbn-workbench .kbn-board { grid-template-columns: repeat(3, minmax(200px, 1fr)); }

.kbn-detail {
  width: clamp(248px, 26vw, 304px);
  flex: none;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsw-alias-bg-layer-2);
  overflow: hidden;
}
.kbn-detail-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 10px 14px;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.kbn-detail-eyebrow {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  letter-spacing: .04em;
}
.kbn-detail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}
.kbn-detail-body::-webkit-scrollbar { width: 8px; }
.kbn-detail-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.kbn-detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.kbn-detail-title {
  margin: 0;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  overflow-wrap: anywhere;
}
.kbn-detail-workspace {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -6px 0 0;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-detail-workspace span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-detail-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.kbn-detail-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}
.kbn-detail-status[data-tone=brand] { color: var(--dsw-alias-state-business-primary); }
.kbn-detail-fields {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}
.kbn-detail-fields dt { color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.kbn-detail-fields dd {
  margin: 0;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.kbn-detail-overdue { color: var(--dsw-alias-state-error-primary); }
.kbn-detail-section {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 12px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.kbn-detail-section-title {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}
.kbn-detail-desc {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.kbn-detail-note {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.kbn-detail-attach { display: flex; flex-direction: column; gap: 6px; }
.kbn-detail-attach-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
  text-decoration: none;
  transition: background-color .15s var(--ds-ease-in-out);
}
.kbn-detail-attach-link:hover { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-detail-attach-link:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.kbn-detail-attach-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-detail-attach-size { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-detail-session {
  display: block;
  padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-markdown-code-block, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 17px;
  overflow-wrap: anywhere;
}
.kbn-detail-actions {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.kbn-detail-blank {
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 28px 24px;
  text-align: center;
  border-style: dashed;
  background: var(--dsw-alias-bg-layer-1);
}
.kbn-detail-blank-icon { color: var(--dsw-alias-label-caption); display: inline-flex; }
.kbn-detail-blank-title {
  margin: 4px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}

.kbn-card { cursor: pointer; }
.kbn-card:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.kbn-card-send {
  width: 26px;
  height: 26px;
  flex: none;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
  cursor: pointer;
  transition: filter .15s var(--ds-ease-in-out), opacity .15s var(--ds-ease-in-out);
}
.kbn-card-send:hover:not(:disabled) { filter: brightness(1.07); }
.kbn-card-send:disabled { opacity: .45; cursor: not-allowed; }
.kbn-card-send:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

@media (max-width: 940px) {
  .kbn-workbench { flex-direction: column; flex: none; }
  .kbn-workbench .kbn-board-region { overflow: visible; }
  .kbn-detail { width: 100%; max-height: 420px; }
}

@media (prefers-reduced-motion: reduce) {
  .kbn-card-send,
  .kbn-detail-attach-link { transition: none; }
}
`);

// Card chrome: edit sits in the top-right corner above the urgency badge, the
// run-in-session circle is pinned to the bottom-right corner (composer-style
// blue send button), and the footer keeps a clear lane for it.
addStyle(`
.kbn-card-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.kbn-card-edit {
  width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  margin: -2px -2px 0 0;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-card-edit:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.kbn-card-edit:disabled { opacity: .4; cursor: not-allowed; }
.kbn-card-edit:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.kbn-card[data-has-send=true] .kbn-card-foot { padding-right: 40px; }
.kbn-card-send {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  width: 30px;
  height: 30px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
  background: var(--dsw-alias-state-business-primary);
  color: var(--dsw-static-neutral-bluish-00, #fff);
}
.kbn-card-send:hover:not(:disabled) { filter: brightness(1.06); }
`);

// Card head: the corner column (edit above urgency) is absolutely placed so it
// does not stretch the title row — otherwise the description is pushed down by
// the badge height and the card shows a dead gap under the title.
addStyle(`
.kbn-card-head {
  position: relative;
  padding-right: 68px;
}
.kbn-card-side {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.kbn-card-desc {
  padding-right: 68px;
  font-size: 12px;
  line-height: 18px;
}
.kbn-card-tags { padding-right: 0; }
`);

// Breathing room in the card's right-hand lane: the edit glyph, the urgency
// badge and the bottom-right send button are three separate anchors, so a short
// card needs a minimum height and wider inner padding or they crowd each other.
addStyle(`
.kbn-card {
  padding: 14px;
  gap: 9px;
}
.kbn-card-head { padding-right: 70px; }
.kbn-card-side { gap: 8px; }
.kbn-card-desc { padding-right: 70px; }
.kbn-card-send {
  right: 12px;
  bottom: 12px;
}
.kbn-card[data-has-send=true] { min-height: 122px; }
.kbn-card[data-has-send=true] .kbn-card-foot { padding-right: 42px; }
`);

// Keep every card taller than its corner stack, and reserve the right lane in
// the footer so the badge / send circle never sit on footer content.
addStyle(`
.kbn-card { min-height: 96px; }
.kbn-card[data-has-send=true] { min-height: 128px; }
.kbn-card-foot { padding-right: 70px; }
.kbn-card[data-has-send=true] .kbn-card-foot { padding-right: 46px; }
`);

// Detail header: the edit affordance reuses the card's corner glyph so the two
// surfaces share one style, and sits before the close button at the top-right.
addStyle(`
.kbn-detail-head-actions {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.kbn-detail-edit {
  margin: 0;
  width: 24px;
  height: 24px;
}
`);

// Assignee block: the two labels were removed, so the segmented control and the
// account identity card carry the section on their own with one clear gap.
addStyle(`
.kbn-assignee-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kbn-assignee-block .kbn-seg { align-self: flex-start; }
.kbn-assignee-block .kbn-account-card { max-width: 100%; }
`);

// Pin the meta row (assignee / attachments / status) to the card's bottom-left
// so it sits on the same baseline as the bottom-right send circle instead of
// floating in the middle of a card whose min-height reserves the send lane.
addStyle(`
.kbn-card-foot {
  margin-top: auto;
  align-items: center;
  min-height: 24px;
}
`);

// Stable card colouring.
//
// Earlier layers let three accents compete on one card: a status-tinted body, a
// status-tinted hover, an AI-tinted border and a per-column selection ring. On a
// Done card that mixed green (status) with blue/teal (selection) and looked
// unstable. The scheme below is the single source of truth: the card surface is
// always neutral, status is one 3px left accent, and selection is always the
// business accent regardless of column or assignee.
addStyle(`
.kbn-card {
  background: var(--dsw-alias-bg-layer-1);
  border: .5px solid var(--dsw-alias-border-l2);
  border-left: 3px solid var(--kbn-col-tone, var(--dsw-alias-border-l2));
}
.kbn-card:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l3);
  border-left-color: var(--kbn-col-tone, var(--dsw-alias-border-l3));
}
.kbn-card[data-ai=true] {
  border-color: var(--dsw-alias-border-l2);
  border-left-color: var(--kbn-col-tone, var(--dsw-alias-border-l2));
}
.kbn-card[data-ai=true]:hover {
  border-color: var(--dsw-alias-border-l3);
  border-left-color: var(--kbn-col-tone, var(--dsw-alias-border-l3));
}
.kbn-card[data-selected=true],
.kbn-card[data-selected=true]:hover,
.kbn-card[data-ai=true][data-selected=true],
.kbn-card[data-ai=true][data-selected=true]:hover {
  border-color: var(--dsw-alias-state-business-primary);
  border-left-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary);
}
`);

// Resizable detail pane.
//
// A 6px grab strip sits between the board and the detail sheet. The width comes
// from `--kbn-detail-width` (written by the drag handler); the fallback keeps the
// responsive clamp, and the max bound is computed from the live workbench width
// so the three columns never collapse below their floor.
addStyle(`
.kbn-workbench { align-items: stretch; }
.kbn-workbench[data-resizing=true] { user-select: none; }
.kbn-workbench .kbn-board { grid-template-columns: repeat(3, minmax(190px, 1fr)); }
.kbn-detail {
  width: var(--kbn-detail-width, clamp(248px, 26vw, 304px));
  transition: none;
}
.kbn-detail-resizer {
  flex: none;
  width: 6px;
  align-self: stretch;
  position: relative;
  cursor: col-resize;
  border-radius: 999px;
  background: transparent;
  touch-action: none;
  outline: none;
}
.kbn-detail-resizer-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 44px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  opacity: .45;
  transition: opacity .12s var(--ds-ease-in-out), background-color .12s var(--ds-ease-in-out);
}
.kbn-detail-resizer:hover .kbn-detail-resizer-grip,
.kbn-detail-resizer:focus-visible .kbn-detail-resizer-grip,
.kbn-detail-resizer[data-resizing=true] .kbn-detail-resizer-grip {
  opacity: 1;
  background: var(--dsw-alias-state-business-primary);
}
.kbn-detail-resizer[data-resizing=true] .kbn-detail-resizer-grip { height: 100%; }
.kbn-detail-resizer:focus-visible {
  box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary);
  border-radius: var(--dsw-radius-sm);
}

@media (max-width: 940px) {
  .kbn-detail-resizer { display: none; }
  .kbn-detail { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .kbn-detail-resizer-grip { transition: none; }
}
`);

// Detail footer: secondary actions, the destructive action and the primary run
// action share one right-aligned row; the primary sits last (rightmost) and the
// destructive button is separated from it by a small gap.
addStyle(`
.kbn-detail-actions {
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}
.kbn-detail-actions .kbn-btn { flex: none; }
.kbn-detail-actions .kbn-btn[data-variant=primary] {
  min-width: 104px;
  justify-content: center;
}
.kbn-detail-actions .kbn-btn[data-variant=danger] { margin-right: 4px; }
.kbn-detail-actions .kbn-btn[data-variant=danger]:focus-visible,
.kbn-detail-actions .kbn-btn[data-variant=ghost]:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
`);
