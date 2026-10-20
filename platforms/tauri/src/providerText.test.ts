import {it,expect} from 'vitest';
import {providerText} from './providerText';
it('uses shared provider translations and preserves unknown diagnostics',()=>{
 expect(providerText('Weekly','zh-Hans')).toBe('每周');
 expect(providerText('Weekly','en')).toBe('Weekly');
 expect(providerText('Diagnostic test 123','ja')).toBe('Diagnostic test 123');
});
