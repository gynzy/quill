import Inline from '../blots/inline';
import Parchment from 'parchment';

class Bold extends Inline {
  static create() {
    return super.create();
  }

  static formats() {
    return true;
  }

  optimize(context) {
    super.optimize(context);
    if (this.domNode.tagName !== this.statics.tagName[0]) {
      this.replaceWith(this.statics.blotName);
    }
  }
}
Bold.blotName = 'bold';
Bold.tagName = ['STRONG', 'B'];

Bold.defaultChild = 'break';

export default Bold;

export const BoldStyle = new Parchment.Attributor.Style('bold-<alt>', 'font-weight', {scope: Parchment.Scope.INLINE});
