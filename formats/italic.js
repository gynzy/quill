import Parchment from 'parchment';
import Bold from './bold';

class Italic extends Bold { }
Italic.blotName = 'italic';
Italic.tagName = ['EM', 'I'];

export default Italic;

export const ItalicStyle = new Parchment.Attributor.Style('italic-<alt>', 'font-style', {scope: Parchment.Scope.INLINE});
