/**
 * Phase P41 / V1.5: Safe Non-Executable Template Engine & Template Pack Manager
 * 
 * Provides deterministic variable substitution (e.g. {{date}}, {{time}}, {{title}}, {{current_context}})
 * strictly without eval or arbitrary script execution.
 */

export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  content: string;
  tags?: string[];
  folder?: string;
  variables?: string[];
}

export interface TemplateContext {
  title?: string;
  author?: string;
  current_context?: string;
  customVars?: Record<string, string>;
}

export interface TemplatePack {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  templates: TemplateDefinition[];
}

export class TemplateEngine {
  /**
   * Renders a template with deterministic variable replacement.
   * Pure lexical substitution — zero JavaScript evaluation.
   */
  public render(templateText: string, context: TemplateContext = {}): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    const datetimeStr = now.toISOString();

    const replacements: Record<string, string> = {
      date: dateStr,
      time: timeStr,
      datetime: datetimeStr,
      title: context.title || 'Untitled',
      author: context.author || '',
      current_context: context.current_context || 'Default Space',
      ...(context.customVars || {}),
    };

    // Replace {{variable}} and {{ variable }}
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
      if (varName in replacements) {
        return replacements[varName];
      }
      return match; // Leave unknown variables intact
    });
  }

  /**
   * Validates a template pack for import without script injections
   */
  public validateTemplatePack(raw: unknown): { valid: boolean; pack?: TemplatePack; errors: string[] } {
    const errors: string[] = [];
    if (!raw || typeof raw !== 'object') {
      return { valid: false, errors: ['Template pack must be a non-null object.'] };
    }

    const obj = raw as Record<string, any>;
    if (!obj.id || typeof obj.id !== 'string') errors.push('Pack must have an "id".');
    if (!obj.name || typeof obj.name !== 'string') errors.push('Pack must have a "name".');
    if (!Array.isArray(obj.templates) || obj.templates.length === 0) {
      errors.push('Pack must contain at least one template.');
    }

    const sanitizedTemplates: TemplateDefinition[] = [];
    if (Array.isArray(obj.templates)) {
      for (const t of obj.templates) {
        if (!t || typeof t !== 'object') continue;
        if (!t.id || typeof t.id !== 'string') {
          errors.push('Every template must have a valid string "id".');
          continue;
        }
        if (!t.name || typeof t.name !== 'string') {
          errors.push('Every template must have a valid string "name".');
          continue;
        }
        sanitizedTemplates.push({
          id: t.id,
          name: t.name,
          description: typeof t.description === 'string' ? t.description : undefined,
          category: typeof t.category === 'string' ? t.category : undefined,
          content: typeof t.content === 'string' ? t.content : '',
          tags: Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string') : [],
          folder: typeof t.folder === 'string' ? t.folder : undefined,
        });
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const pack: TemplatePack = {
      id: obj.id,
      name: obj.name,
      version: typeof obj.version === 'string' ? obj.version : '1.0.0',
      author: typeof obj.author === 'string' ? obj.author : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      templates: sanitizedTemplates,
    };

    return { valid: true, pack, errors: [] };
  }
}

export const templateEngine = new TemplateEngine();
