import { EXPECTED_MENU } from '../../constants';
import { MenuItemPO } from './menu-item.po';

export class LearnMoreMenuItemPO extends MenuItemPO {
  static readonly MENUS = [EXPECTED_MENU.HELP.id, EXPECTED_MENU.HELP.x.LEARN_MORE.id];
}
