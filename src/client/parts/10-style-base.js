/**
 * Base stylesheet: page shell, header, buttons, form controls, chips, dialog,
 * empty state, spinner, toast and layout utilities.
 *
 * Geometry, colors and states are copied from the running Harness
 * (`dsh-client-ui-primitives` CSS and the official panel styles) and are
 * expressed only through `--dsw-*` tokens so light/dark both work.
 * Board-owned selectors (ARCHITECTURE.md §10 "Board part") are intentionally absent.
 */
addStyle(`
/* ---------------------------------------------------------------- page shell */

.kbn-root{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:14px;line-height:22px}

.kbn-root{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;-webkit-font-smoothing:antialiased}

.kbn-root *,.kbn-root *::before,.kbn-root *::after{box-sizing:border-box}

.kbn-page{display:flex;flex-direction:column;flex:1;min-height:0;width:100%;max-width:none}

.kbn-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0 24px 24px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent}

.kbn-scroll::-webkit-scrollbar{width:10px;height:10px}

.kbn-scroll::-webkit-scrollbar-track{background:transparent}

.kbn-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border:2px solid transparent;border-radius:999px;background-clip:content-box}

.kbn-scroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2);background-clip:content-box}

/* ------------------------------------------------------------------ header */

.kbn-head{display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px 16px;flex:none;padding:18px 24px 10px}

.kbn-head-main{display:flex;flex-direction:column;gap:2px;flex:1 1 140px;min-width:0}

.kbn-title{margin:0;font-size:20px;line-height:28px;font-weight:600;letter-spacing:-.01em;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.kbn-subtitle{margin:0;font-size:13px;line-height:20px;font-weight:400;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}

.kbn-head-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;max-width:100%;margin-inline-start:auto;padding-top:2px}

.kbn-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;flex:none;padding:0 24px 12px}

/* ----------------------------------------------------------------- buttons */

.kbn-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;white-space:nowrap;user-select:none;cursor:pointer;flex:none;transition:background-color .12s var(--ds-ease-in-out),color .12s var(--ds-ease-in-out),border-color .12s var(--ds-ease-in-out),opacity .12s var(--ds-ease-in-out)}

.kbn-btn:disabled{cursor:not-allowed;opacity:.4}

.kbn-btn[data-size=sm]{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm);font-size:12px;line-height:18px}

.kbn-btn[data-variant=primary]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}

.kbn-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}

.kbn-btn[data-variant=outline]{border:.5px solid var(--dsw-alias-border-l3);background:transparent}

.kbn-btn[data-variant=outline]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}

.kbn-btn[data-variant=ghost]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}

.kbn-btn[data-variant=ghost]:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}

.kbn-btn[data-variant=danger]{color:var(--dsw-alias-state-error-primary)}

.kbn-btn[data-variant=danger]:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}

.kbn-btn>svg{flex:none}

.kbn-btn:focus-visible,.kbn-icon-btn:focus-visible,.kbn-dialog-close:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));outline-offset:2px}

/* ------------------------------------------------------------- icon buttons */

.kbn-icon-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;transition:background-color .12s var(--ds-ease-in-out),color .12s var(--ds-ease-in-out)}

.kbn-icon-btn[data-size="24"]{width:24px;height:24px}

.kbn-icon-btn[data-size="16"]{width:16px;height:16px;border-radius:var(--dsw-radius-xs)}

.kbn-icon-btn[data-variant=outline]{border:.5px solid var(--dsw-alias-border-l3)}

.kbn-icon-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}

.kbn-icon-btn:disabled{cursor:not-allowed;opacity:.4}

.kbn-icon-btn>svg{flex:none}

/* ------------------------------------------------------------- form fields */

.kbn-field{display:flex;flex-direction:column;gap:6px;min-width:0}

.kbn-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}

.kbn-label{font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-secondary);min-width:0;overflow-wrap:anywhere}

.kbn-label[data-required=true]::after{content:" *";color:var(--dsw-alias-state-error-primary)}

.kbn-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);text-align:right;overflow-wrap:anywhere}

.kbn-error-text{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}

/* ------------------------------------------------- inputs / textarea / select */

.kbn-input-wrap{position:relative;display:flex;align-items:center;min-width:0;width:100%}

.kbn-input-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);pointer-events:none;z-index:1}

.kbn-input-icon[data-side=right]{left:auto;right:10px}

.kbn-input,.kbn-textarea,.kbn-select{box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;outline:none}

.kbn-input,.kbn-select{height:36px;padding:0 12px}

.kbn-input-wrap[data-icon=true] .kbn-input{padding-left:34px}

.kbn-input-wrap[data-select=true] .kbn-select{padding-left:12px;padding-right:32px}

.kbn-input::placeholder,.kbn-textarea::placeholder{color:var(--dsw-alias-label-tertiary);opacity:1}

.kbn-textarea{min-height:64px;max-height:220px;padding:8px 12px;line-height:20px;resize:none;overflow-y:auto}

.kbn-select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:32px}

.kbn-select:disabled,.kbn-input:disabled,.kbn-textarea:disabled{cursor:not-allowed;opacity:.4;color:var(--dsw-alias-label-secondary)}

.kbn-input:focus-visible,.kbn-textarea:focus-visible,.kbn-select:focus-visible{border-color:var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)) 18%, transparent)}.kbn-input[type=date]{padding-right:10px}
.kbn-input[type=date][data-empty=true]{color:var(--dsw-alias-label-tertiary)}
.kbn-input[type=date]::-webkit-calendar-picker-indicator{opacity:.65;cursor:pointer}
.kbn-input[type=date]::-webkit-calendar-picker-indicator:hover{opacity:1}
body[data-ds-dark-theme] .kbn-root{color-scheme:dark}

/* -------------------------------------------------------------------- chips */

.kbn-chip{display:inline-flex;align-items:center;gap:4px;height:26px;max-width:100%;padding:0 12px;border-radius:10px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;vertical-align:middle}

.kbn-chip>svg{flex:none;opacity:.8}

.kbn-chip[data-tone=brand]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);color:var(--dsw-alias-state-business-primary)}

.kbn-chip[data-tone=success]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary)}

.kbn-chip[data-tone=warn]{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);color:var(--dsw-alias-state-warn-primary)}

.kbn-chip[data-tone=danger]{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);color:var(--dsw-alias-state-error-primary)}

.kbn-chip .kbn-icon-btn{width:16px;height:16px;margin-right:-6px;color:inherit;opacity:.7}

.kbn-chip .kbn-icon-btn:hover:not(:disabled){background:color-mix(in srgb, currentColor 14%, transparent);color:inherit;opacity:1}

/* -------------------------------------------------------------------- dialog */

.kbn-mask{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);-webkit-backdrop-filter:var(--dsw-mask-blur);animation:kbn-mask-in .16s var(--ds-ease-in-out)}

.kbn-dialog{box-sizing:border-box;position:relative;z-index:1;display:flex;flex-direction:column;width:min(520px, 100%);max-width:calc(100vw - 48px);max-height:calc(100dvh - 108px);border-radius:24px;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);overflow:hidden;outline:none;animation:kbn-dialog-in .16s var(--ds-ease-in-out)}

.kbn-dialog-head{display:flex;align-items:center;gap:12px;flex:none;padding:20px 18px 12px 24px}

.kbn-dialog-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-secondary)}

.kbn-dialog-title{margin:0;flex:1;min-width:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.kbn-dialog-close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}

.kbn-dialog-close:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}

.kbn-dialog-close:disabled{cursor:not-allowed;opacity:.4}

.kbn-dialog-body{display:flex;flex-direction:column;gap:16px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 24px 8px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent}

.kbn-dialog-body::-webkit-scrollbar{width:10px}

.kbn-dialog-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border:2px solid transparent;border-radius:999px;background-clip:content-box}

.kbn-dialog-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;padding:12px 24px 20px;border-top:.5px solid var(--dsw-alias-border-l1)}

@keyframes kbn-mask-in{from{opacity:0}to{opacity:1}}

@keyframes kbn-dialog-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}

/* --------------------------------------------------------------- empty state */

.kbn-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:1;min-height:180px;padding:40px 24px;text-align:center;color:var(--dsw-alias-label-secondary)}

.kbn-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;margin-bottom:2px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-tertiary)}

.kbn-empty-title{margin:0;font-size:14px;line-height:22px;font-weight:500;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}

.kbn-empty-desc{max-width:360px;margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}

.kbn-empty-action{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px}

/* ------------------------------------------------------------------- spinner */

.kbn-spinner{display:inline-block;flex:none;width:16px;height:16px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-secondary);border-radius:50%;animation:kbn-spin .7s linear infinite;box-sizing:border-box}

@keyframes kbn-spin{to{transform:rotate(360deg)}}

/* --------------------------------------------------------------------- toast */

.kbn-toast{position:absolute;right:20px;bottom:20px;z-index:1100;display:flex;align-items:center;gap:8px;max-width:min(420px, calc(100vw - 40px));padding:10px 14px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-toast-bg);color:var(--dsw-alias-toast-label);font-size:13px;line-height:20px;box-shadow:var(--dsw-elevation-soft);pointer-events:none;overflow-wrap:anywhere;animation:kbn-toast-in .16s var(--ds-ease-in-out)}

.kbn-toast>svg{flex:none;opacity:.9}

.kbn-toast[data-kind=error]>svg{color:var(--dsw-alias-state-error-primary)}

@keyframes kbn-toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ---------------------------------------------------------------- utilities */

.kbn-divider{height:.5px;margin:8px 0;border:0;background:var(--dsw-alias-border-l2);flex:none}

.kbn-row{display:flex;align-items:center;gap:8px;min-width:0}

.kbn-stack{display:flex;flex-direction:column;gap:8px;min-width:0}

.kbn-visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

/* ------------------------------------------------------- reduced motion */

@media (prefers-reduced-motion: reduce){
.kbn-btn,.kbn-icon-btn,.kbn-dialog-close{transition:none}
.kbn-mask,.kbn-dialog,.kbn-toast{animation:none}
.kbn-spinner{animation:none}
}
`);
