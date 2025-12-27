'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import type { StepType, StepConfig } from '../actions/rule-actions';

// 国家代码列表
const COUNTRIES = [
  { code: 'CN', name: '中国' },
  { code: 'US', name: '美国' },
  { code: 'JP', name: '日本' },
  { code: 'KR', name: '韩国' },
  { code: 'GB', name: '英国' },
  { code: 'FR', name: '法国' },
  { code: 'DE', name: '德国' },
  { code: 'IT', name: '意大利' },
  { code: 'ES', name: '西班牙' },
  { code: 'RU', name: '俄罗斯' },
  { code: 'IN', name: '印度' },
  { code: 'BR', name: '巴西' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'CA', name: '加拿大' },
  { code: 'MX', name: '墨西哥' },
  { code: 'SG', name: '新加坡' },
  { code: 'HK', name: '香港' },
  { code: 'TW', name: '台湾' },
  { code: 'TH', name: '泰国' },
  { code: 'VN', name: '越南' }
];

// 语言代码列表
const LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁体中文' },
  { code: 'en', name: '英语' },
  { code: 'en-US', name: '美式英语' },
  { code: 'en-GB', name: '英式英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'it', name: '意大利语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'hi', name: '印地语' },
  { code: 'th', name: '泰语' },
  { code: 'vi', name: '越南语' }
];

// IP类型列表
const IP_TYPES = [
  { code: 'ISP', name: 'ISP（互联网服务提供商）' },
  { code: 'IDC', name: 'IDC（互联网数据中心）' },
  { code: 'MOBILE', name: '移动网络' },
  { code: 'RESIDENTIAL', name: '住宅网络' },
  { code: 'CORPORATE', name: '企业网络' },
  { code: 'EDUCATIONAL', name: '教育网络' },
  { code: 'GOVERNMENT', name: '政府网络' }
];

interface StepConfigEditorProps {
  type: StepType;
  config: StepConfig;
  onChange: (config: StepConfig) => void;
}

export function StepConfigEditor({
  type,
  config,
  onChange
}: StepConfigEditorProps) {
  // 所有 state 必须在顶层声明
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    type === 'country' ? (config as any)?.countries || [] : []
  );
  const [countryMatchMode, setCountryMatchMode] = useState<
    'include' | 'exclude'
  >(type === 'country' ? (config as any)?.match_mode || 'include' : 'include');

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    type === 'language' ? (config as any)?.languages || [] : []
  );
  const [languageMatchMode, setLanguageMatchMode] = useState<
    'include' | 'exclude'
  >(type === 'language' ? (config as any)?.match_mode || 'include' : 'include');

  const [ips, setIps] = useState<string[]>(
    type === 'ip' ? (config as any)?.ips || [] : []
  );
  const [newIp, setNewIp] = useState('');
  const [ipMatchMode, setIpMatchMode] = useState<'whitelist' | 'blacklist'>(
    type === 'ip' ? (config as any)?.match_mode || 'whitelist' : 'whitelist'
  );

  const [uaPattern, setUaPattern] = useState(
    type === 'user_agent' ? (config as any)?.pattern || '' : ''
  );
  const [uaMatchMode, setUaMatchMode] = useState<'regex' | 'contains'>(
    type === 'user_agent'
      ? (config as any)?.match_mode || 'contains'
      : 'contains'
  );

  const [pathPattern, setPathPattern] = useState(
    type === 'path' ? (config as any)?.pattern || '' : ''
  );
  const [pathMatchMode, setPathMatchMode] = useState<'regex' | 'contains'>(
    type === 'path' ? (config as any)?.match_mode || 'contains' : 'contains'
  );

  const [matchBot, setMatchBot] = useState(
    type === 'bot' ? ((config as any)?.match_bot ?? true) : true
  );

  const [paramName, setParamName] = useState(
    type === 'params_search' ? (config as any)?.param_name || '' : ''
  );
  const [paramValue, setParamValue] = useState(
    type === 'params_search' ? (config as any)?.param_value || '' : ''
  );
  const [paramMatchMode, setParamMatchMode] = useState<
    'regex' | 'contains' | 'equals'
  >(
    type === 'params_search'
      ? (config as any)?.match_mode || 'equals'
      : 'equals'
  );

  const [selectedIpTypes, setSelectedIpTypes] = useState<string[]>(
    type === 'ip_type' ? (config as any)?.ip_types || [] : []
  );
  const [ipTypeMatchMode, setIpTypeMatchMode] = useState<'include' | 'exclude'>(
    type === 'ip_type' ? (config as any)?.match_mode || 'include' : 'include'
  );

  // 当 config 或 type 改变时，同步更新 state
  useEffect(() => {
    if (type === 'country') {
      const countryConfig = config as any;
      setSelectedCountries(countryConfig?.countries || []);
      setCountryMatchMode(countryConfig?.match_mode || 'include');
    } else if (type === 'language') {
      const languageConfig = config as any;
      setSelectedLanguages(languageConfig?.languages || []);
      setLanguageMatchMode(languageConfig?.match_mode || 'include');
    } else if (type === 'ip') {
      const ipConfig = config as any;
      setIps(ipConfig?.ips || []);
      setIpMatchMode(ipConfig?.match_mode || 'whitelist');
    } else if (type === 'user_agent') {
      const uaConfig = config as any;
      setUaPattern(uaConfig?.pattern || '');
      setUaMatchMode(uaConfig?.match_mode || 'contains');
    } else if (type === 'path') {
      const pathConfig = config as any;
      setPathPattern(pathConfig?.pattern || '');
      setPathMatchMode(pathConfig?.match_mode || 'contains');
    } else if (type === 'bot') {
      const botConfig = config as any;
      setMatchBot(botConfig?.match_bot ?? true);
    } else if (type === 'params_search') {
      const paramsConfig = config as any;
      setParamName(paramsConfig?.param_name || '');
      setParamValue(paramsConfig?.param_value || '');
      setParamMatchMode(paramsConfig?.match_mode || 'equals');
    } else if (type === 'ip_type') {
      const ipTypeConfig = config as any;
      setSelectedIpTypes(ipTypeConfig?.ip_types || []);
      setIpTypeMatchMode(ipTypeConfig?.match_mode || 'include');
    }
  }, [type, config]);

  // 当 state 改变时，通知父组件
  useEffect(() => {
    if (type === 'country') {
      onChange({
        type: 'country',
        countries: selectedCountries,
        match_mode: countryMatchMode
      });
    } else if (type === 'language') {
      onChange({
        type: 'language',
        languages: selectedLanguages,
        match_mode: languageMatchMode
      });
    } else if (type === 'ip') {
      onChange({
        type: 'ip',
        ips,
        match_mode: ipMatchMode
      });
    } else if (type === 'user_agent') {
      onChange({
        type: 'user_agent',
        pattern: uaPattern,
        match_mode: uaMatchMode
      });
    } else if (type === 'path') {
      onChange({
        type: 'path',
        pattern: pathPattern,
        match_mode: pathMatchMode
      });
    } else if (type === 'bot') {
      onChange({
        type: 'bot',
        match_bot: matchBot
      });
    } else if (type === 'params_search') {
      onChange({
        type: 'params_search',
        param_name: paramName,
        param_value: paramValue,
        match_mode: paramMatchMode
      });
    } else if (type === 'ip_type') {
      onChange({
        type: 'ip_type',
        ip_types: selectedIpTypes,
        match_mode: ipTypeMatchMode
      });
    }
  }, [
    type,
    selectedCountries,
    countryMatchMode,
    selectedLanguages,
    languageMatchMode,
    ips,
    ipMatchMode,
    uaPattern,
    uaMatchMode,
    pathPattern,
    pathMatchMode,
    matchBot,
    paramName,
    paramValue,
    paramMatchMode,
    selectedIpTypes,
    ipTypeMatchMode,
    onChange
  ]);

  // 根据类型渲染不同的 UI
  if (type === 'country') {
    const toggleCountry = (code: string) => {
      setSelectedCountries((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      );
    };

    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={countryMatchMode}
            onValueChange={(value) =>
              setCountryMatchMode(value as 'include' | 'exclude')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='include'>包含（在列表中的国家）</SelectItem>
              <SelectItem value='exclude'>排除（不在列表中的国家）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>选择国家</label>
          <div className='flex flex-wrap gap-2'>
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                type='button'
                onClick={() => toggleCountry(country.code)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  selectedCountries.includes(country.code)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {country.name} ({country.code})
              </button>
            ))}
          </div>
        </div>

        {selectedCountries.length > 0 && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>已选择</label>
            <div className='flex flex-wrap gap-2'>
              {selectedCountries.map((code) => {
                const country = COUNTRIES.find((c) => c.code === code);
                return (
                  <Badge
                    key={code}
                    variant='secondary'
                    className='flex items-center gap-1'
                  >
                    {country?.name || code}
                    <button
                      type='button'
                      onClick={() => toggleCountry(code)}
                      className='hover:bg-destructive hover:text-destructive-foreground ml-1 rounded-full'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'language') {
    const toggleLanguage = (code: string) => {
      setSelectedLanguages((prev) =>
        prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
      );
    };

    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={languageMatchMode}
            onValueChange={(value) =>
              setLanguageMatchMode(value as 'include' | 'exclude')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='include'>包含（在列表中的语言）</SelectItem>
              <SelectItem value='exclude'>排除（不在列表中的语言）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>选择语言</label>
          <div className='flex flex-wrap gap-2'>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type='button'
                onClick={() => toggleLanguage(lang.code)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  selectedLanguages.includes(lang.code)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {lang.name} ({lang.code})
              </button>
            ))}
          </div>
        </div>

        {selectedLanguages.length > 0 && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>已选择</label>
            <div className='flex flex-wrap gap-2'>
              {selectedLanguages.map((code) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <Badge
                    key={code}
                    variant='secondary'
                    className='flex items-center gap-1'
                  >
                    {lang?.name || code}
                    <button
                      type='button'
                      onClick={() => toggleLanguage(code)}
                      className='hover:bg-destructive hover:text-destructive-foreground ml-1 rounded-full'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'ip') {
    const addIp = () => {
      if (newIp.trim() && !ips.includes(newIp.trim())) {
        setIps([...ips, newIp.trim()]);
        setNewIp('');
      }
    };

    const removeIp = (ip: string) => {
      setIps(ips.filter((i) => i !== ip));
    };

    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={ipMatchMode}
            onValueChange={(value) =>
              setIpMatchMode(value as 'whitelist' | 'blacklist')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='whitelist'>
                白名单（允许列表中的 IP）
              </SelectItem>
              <SelectItem value='blacklist'>
                黑名单（拒绝列表中的 IP）
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>
            IP 地址（支持 CIDR，如 192.168.1.0/24）
          </label>
          <div className='flex gap-2'>
            <Input
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIp()}
              placeholder='例如: 192.168.1.1 或 192.168.1.0/24'
            />
            <Button type='button' onClick={addIp}>
              添加
            </Button>
          </div>
        </div>

        {ips.length > 0 && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>已添加的 IP</label>
            <div className='flex flex-wrap gap-2'>
              {ips.map((ip) => (
                <Badge
                  key={ip}
                  variant='secondary'
                  className='flex items-center gap-1'
                >
                  {ip}
                  <button
                    type='button'
                    onClick={() => removeIp(ip)}
                    className='hover:bg-destructive hover:text-destructive-foreground ml-1 rounded-full'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'user_agent') {
    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={uaMatchMode}
            onValueChange={(value) =>
              setUaMatchMode(value as 'regex' | 'contains')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='contains'>包含（简单字符串匹配）</SelectItem>
              <SelectItem value='regex'>正则表达式</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Input
            value={uaPattern}
            onChange={(e) => setUaPattern(e.target.value)}
            placeholder={
              uaMatchMode === 'regex' ? '例如: .*bot.*' : '例如: bot'
            }
          />
          {uaMatchMode === 'regex' && (
            <p className='text-muted-foreground text-xs'>
              使用正则表达式匹配 User-Agent
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'path') {
    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={pathMatchMode}
            onValueChange={(value) =>
              setPathMatchMode(value as 'regex' | 'contains')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='contains'>包含（简单字符串匹配）</SelectItem>
              <SelectItem value='regex'>正则表达式</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>路径模式</label>
          <Input
            value={pathPattern}
            onChange={(e) => setPathPattern(e.target.value)}
            placeholder={
              pathMatchMode === 'regex' ? '例如: /admin.*' : '例如: /admin'
            }
          />
          {pathMatchMode === 'regex' && (
            <p className='text-muted-foreground text-xs'>
              使用正则表达式匹配请求路径
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'bot') {
    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <label className='text-sm font-medium'>匹配机器人</label>
            <p className='text-muted-foreground text-xs'>
              选择是否匹配机器人访问
            </p>
          </div>
          <Switch checked={matchBot} onCheckedChange={setMatchBot} />
        </div>
      </div>
    );
  }

  if (type === 'params_search') {
    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={paramMatchMode}
            onValueChange={(value) =>
              setParamMatchMode(value as 'regex' | 'contains' | 'equals')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='equals'>完全匹配</SelectItem>
              <SelectItem value='contains'>包含（简单字符串匹配）</SelectItem>
              <SelectItem value='regex'>正则表达式</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>参数名</label>
          <Input
            value={paramName}
            onChange={(e) => setParamName(e.target.value)}
            placeholder='例如: token, id, key'
          />
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>参数值</label>
          <Input
            value={paramValue}
            onChange={(e) => setParamValue(e.target.value)}
            placeholder={
              paramMatchMode === 'regex' ? '例如: ^[0-9]+$' : '例如: admin123'
            }
          />
          {paramMatchMode === 'regex' && (
            <p className='text-muted-foreground text-xs'>
              使用正则表达式匹配参数值
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'ip_type') {
    const toggleType = (code: string) => {
      setSelectedIpTypes((prev) =>
        prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]
      );
    };

    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>匹配模式</label>
          <Select
            value={ipTypeMatchMode}
            onValueChange={(value) =>
              setIpTypeMatchMode(value as 'include' | 'exclude')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='include'>包含（在列表中的类型）</SelectItem>
              <SelectItem value='exclude'>排除（不在列表中的类型）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>选择IP类型</label>
          <div className='flex flex-wrap gap-2'>
            {IP_TYPES.map((ipType) => (
              <button
                key={ipType.code}
                type='button'
                onClick={() => toggleType(ipType.code)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  selectedIpTypes.includes(ipType.code)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {ipType.name}
              </button>
            ))}
          </div>
        </div>

        {selectedIpTypes.length > 0 && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>已选择</label>
            <div className='flex flex-wrap gap-2'>
              {selectedIpTypes.map((code) => {
                const ipType = IP_TYPES.find((t) => t.code === code);
                return (
                  <Badge
                    key={code}
                    variant='secondary'
                    className='flex items-center gap-1'
                  >
                    {ipType?.name || code}
                    <button
                      type='button'
                      onClick={() => toggleType(code)}
                      className='hover:bg-destructive hover:text-destructive-foreground ml-1 rounded-full'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
