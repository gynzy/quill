import Parchment from 'parchment';
import Inline from '../blots/inline';

class Underline extends Inline {}
Underline.blotName = 'underline';
Underline.tagName = 'U';

export default Underline;

export const UnderlineStrikeStyle = new Parchment.Attributor.Style('underline-strike-<alt>', 'text-decoration-line', {
  scope: Parchment.Scope.INLINE,
});
