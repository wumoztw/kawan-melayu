import {describe,it,expect} from 'vitest';
import {findMalayVoice,speakMalay} from '../src/ui/tts.js';
import {dialogue} from '../src/ui/components/dialogue.js';

describe('UI safety and voice fallback',()=>{
 it('prefers ms-MY then falls back to id-ID',()=>{const id={lang:'id-ID'},ms={lang:'ms-MY'};expect(findMalayVoice([id,ms])).toBe(ms);expect(findMalayVoice([id])).toBe(id);expect(findMalayVoice([])).toBeNull()});
 it('fails gracefully without speech support',()=>{expect(speakMalay('hai')).toBe(false)});
 it('renders dialogue with text nodes, not HTML',()=>{const parent=document.createElement('div');dialogue(parent,'NPC','<img src=x>');expect(parent.querySelector('img')).toBeNull();expect(parent.textContent).toContain('<img src=x>')});
});
