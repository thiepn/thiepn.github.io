import { sanitizeSvg } from './security/sanitizer';

export interface MermaidRenderResult {
  svg: string;
  isError: boolean;
  errorMessage?: string;
}

let mermaidInstance: any = null;
let lastTheme: 'dark' | 'default' | null = null;
let counter = 0;

/**
 * Dynamically loads Mermaid on demand so that initial app bundle & startup remain light and fast.
 */
export async function getMermaidInstance() {
  if (!mermaidInstance) {
    const mod = await import('mermaid');
    mermaidInstance = mod.default || mod;
  }
  return mermaidInstance;
}

/**
 * Initializes and configures Mermaid with strict security settings and specified theme.
 */
export function configureMermaid(mermaid: any, isDark: boolean) {
  const targetTheme = isDark ? 'dark' : 'default';
  
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict', // Strict security mode: disallow scripts / unsafe HTML tags
    theme: targetTheme,
    fontFamily: 'inherit',
    flowchart: {
      htmlLabels: false,
      useMaxWidth: true,
      curve: 'basis',
    },
    sequence: {
      useMaxWidth: true,
      showSequenceNumbers: false,
    },
    gantt: {
      useMaxWidth: true,
    },
    logLevel: 'error',
  });

  lastTheme = targetTheme;
}

/**
 * Safely renders a Mermaid diagram definition string to clean SVG.
 * Handles syntax errors gracefully without throwing unhandled exceptions.
 */
export async function renderMermaid(
  code: string,
  isDark: boolean
): Promise<MermaidRenderResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { svg: '', isError: false };
  }

  try {
    const mermaid = await getMermaidInstance();
    configureMermaid(mermaid, isDark);

    const uniqueId = `mermaid-svg-${Date.now()}-${++counter}`;

    // Validate syntax before rendering
    try {
      if (typeof mermaid.parse === 'function') {
        const parseRes = await mermaid.parse(trimmed, { suppressErrors: true });
        if (parseRes === false) {
          return {
            svg: '',
            isError: true,
            errorMessage: 'Syntax error in Mermaid diagram definition',
          };
        }
      }
    } catch (parseErr: any) {
      return {
        svg: '',
        isError: true,
        errorMessage: parseErr?.message || 'Syntax error in Mermaid diagram definition',
      };
    }

    const { svg } = await mermaid.render(uniqueId, trimmed);
    const safeSvg = sanitizeSvg(svg);
    return {
      svg: safeSvg,
      isError: false,
    };
  } catch (err: any) {
    return {
      svg: '',
      isError: true,
      errorMessage: err?.message || 'Failed to render Mermaid diagram',
    };
  }
}
