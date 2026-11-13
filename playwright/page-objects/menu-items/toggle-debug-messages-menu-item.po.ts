import { EXPECTED_MENU } from '../../constants';
import { MenuItemPO } from './menu-item.po';

export class ToggleDebugMessagesMenuItemPO extends MenuItemPO {
  static readonly MENUS = [EXPECTED_MENU.VIEW.id, EXPECTED_MENU.VIEW.x.TOGGLE_DEBUG_MESSAGES.id];
}
