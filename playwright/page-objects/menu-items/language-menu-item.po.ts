import { EXPECTED_MENU } from '../../constants';
import { MenuItemPO } from './menu-item.po';

const VIEW = EXPECTED_MENU.VIEW;
const LANGUAGE = VIEW.x.LANGUAGE;

export class EnglishMenuItemPO extends MenuItemPO {
  static readonly MENUS = [VIEW.id, LANGUAGE.id, LANGUAGE.x!.ENGLISH.id];
}

export class FrenchMenuItemPO extends MenuItemPO {
  static readonly MENUS = [VIEW.id, LANGUAGE.id, LANGUAGE.x!.FRENCH.id];
}
