import type { StepType, StepAction, StepConfig } from '../actions/rule-actions';

export interface VisitorInfo {
  ip: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  acceptLanguage: string | null;
  isBot: boolean;
  requestPath: string | null;
  searchParams: Record<string, string>;
  ipType: string | null;
}

export interface RuleStep {
  id: number;
  step_order: number;
  type: StepType;
  name: string;
  config: StepConfig;
  action: StepAction;
  enabled: boolean;
}

export interface Rule {
  id: number;
  name: string;
  steps: RuleStep[];
}

/**
 * 解析 Accept-Language 头，提取语言代码
 */
function parseAcceptLanguage(acceptLanguage: string | null): string[] {
  if (!acceptLanguage) {
    return [];
  }

  const languages: string[] = [];
  const parts = acceptLanguage.split(',');

  for (const part of parts) {
    const lang = part.split(';')[0].trim().toLowerCase();
    if (lang) {
      const mainLang = lang.split('-')[0];
      languages.push(lang);
      if (mainLang !== lang && !languages.includes(mainLang)) {
        languages.push(mainLang);
      }
    }
  }

  return languages;
}

/**
 * 检查 IP 是否匹配 CIDR 或 IP 地址
 */
function matchIP(ip: string, pattern: string): boolean {
  if (ip === pattern) {
    return true;
  }

  if (pattern.includes('/')) {
    const [network, prefixLength] = pattern.split('/');
    const prefix = parseInt(prefixLength, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipToNumber = (ip: string): number => {
      return (
        ip
          .split('.')
          .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
      );
    };

    const networkNum = ipToNumber(network);
    const ipNum = ipToNumber(ip);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;

    return (networkNum & mask) === (ipNum & mask);
  }

  return false;
}

/**
 * 检查字符串是否匹配正则表达式或包含
 */
function matchPattern(
  value: string | null,
  pattern: string,
  mode: 'regex' | 'contains'
): boolean {
  if (!value) {
    return false;
  }

  if (mode === 'regex') {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(value);
    } catch {
      return false;
    }
  } else {
    return value.toLowerCase().includes(pattern.toLowerCase());
  }
}

/**
 * 检查步骤是否匹配访问者信息
 */
function matchStep(visitorInfo: VisitorInfo, step: RuleStep): boolean {
  const { type, config } = step;

  switch (type) {
    case 'country': {
      const countryConfig = config as {
        countries: string[];
        match_mode: 'include' | 'exclude';
      };
      if (!visitorInfo.country) {
        return false;
      }
      const countryUpper = visitorInfo.country.toUpperCase();
      const isInList = countryConfig.countries.some(
        (c) => c.toUpperCase() === countryUpper
      );
      return countryConfig.match_mode === 'include' ? isInList : !isInList;
    }

    case 'language': {
      const languageConfig = config as {
        languages: string[];
        match_mode: 'include' | 'exclude';
      };
      const visitorLanguages = parseAcceptLanguage(visitorInfo.acceptLanguage);
      if (visitorLanguages.length === 0) {
        return false;
      }
      const hasMatch = visitorLanguages.some((visitorLang) =>
        languageConfig.languages.some((configLang) => {
          const visitorLangLower = visitorLang.toLowerCase();
          const configLangLower = configLang.toLowerCase();
          return (
            visitorLangLower === configLangLower ||
            visitorLangLower.startsWith(configLangLower + '-') ||
            configLangLower.startsWith(visitorLangLower + '-')
          );
        })
      );
      return languageConfig.match_mode === 'include' ? hasMatch : !hasMatch;
    }

    case 'ip': {
      const ipConfig = config as {
        ips: string[];
        match_mode: 'whitelist' | 'blacklist';
      };
      const isInList = ipConfig.ips.some((ipPattern) =>
        matchIP(visitorInfo.ip, ipPattern)
      );
      return ipConfig.match_mode === 'whitelist' ? isInList : !isInList;
    }

    case 'user_agent': {
      const uaConfig = config as {
        pattern: string;
        match_mode: 'regex' | 'contains';
      };
      return matchPattern(
        visitorInfo.userAgent,
        uaConfig.pattern,
        uaConfig.match_mode
      );
    }

    case 'path': {
      const pathConfig = config as {
        pattern: string;
        match_mode: 'regex' | 'contains';
      };
      return matchPattern(
        visitorInfo.requestPath,
        pathConfig.pattern,
        pathConfig.match_mode
      );
    }

    case 'bot': {
      const botConfig = config as { match_bot: boolean };
      return visitorInfo.isBot === botConfig.match_bot;
    }

    case 'params_search': {
      const paramsConfig = config as {
        param_name: string;
        param_value: string;
        match_mode: 'regex' | 'contains' | 'equals';
      };
      const paramValue = visitorInfo.searchParams[paramsConfig.param_name];
      if (!paramValue) {
        return false;
      }

      switch (paramsConfig.match_mode) {
        case 'equals':
          return paramValue === paramsConfig.param_value;
        case 'contains':
          return paramValue
            .toLowerCase()
            .includes(paramsConfig.param_value.toLowerCase());
        case 'regex':
          try {
            const regex = new RegExp(paramsConfig.param_value, 'i');
            return regex.test(paramValue);
          } catch {
            return false;
          }
        default:
          return false;
      }
    }

    case 'ip_type': {
      const ipTypeConfig = config as {
        ip_types: string[];
        match_mode: 'include' | 'exclude';
      };
      if (!visitorInfo.ipType) {
        return false;
      }
      const ipTypeUpper = visitorInfo.ipType.toUpperCase();
      const isInList = ipTypeConfig.ip_types.some(
        (t) => t.toUpperCase() === ipTypeUpper
      );
      return ipTypeConfig.match_mode === 'include' ? isInList : !isInList;
    }

    default:
      return false;
  }
}

/**
 * 应用规则进行认证检查
 * 按步骤顺序执行，返回 true 表示允许访问，false 表示拒绝访问
 */
export function checkRule(visitorInfo: VisitorInfo, rule: Rule): boolean {
  // 如果没有步骤，默认允许访问
  if (!rule.steps || rule.steps.length === 0) {
    return true;
  }

  // 按顺序执行步骤
  for (const step of rule.steps) {
    // 跳过未启用的步骤
    if (!step.enabled) {
      continue;
    }

    // 检查步骤是否匹配
    const matched = matchStep(visitorInfo, step);

    if (matched) {
      // 如果匹配，根据动作决定下一步
      switch (step.action) {
        case 'intercept':
          // 拦截：直接拒绝，忽略后续步骤
          return false;

        case 'allow':
          // 放行：直接允许，忽略后续步骤
          return true;

        case 'continue':
          // 继续：执行下一个步骤
          continue;

        default:
          // 未知动作，继续执行
          continue;
      }
    } else {
      // 如果不匹配，继续执行下一个步骤
      continue;
    }
  }

  // 所有步骤都执行完毕，如果没有明确的拦截或放行，默认允许访问
  return true;
}
