import home from '@phosphor-icons/core/assets/regular/house.svg?raw';
import apps from '@phosphor-icons/core/assets/regular/squares-four.svg?raw';
import tasks from '@phosphor-icons/core/assets/regular/check-square.svg?raw';
import calendar from '@phosphor-icons/core/assets/regular/calendar-blank.svg?raw';
import chart from '@phosphor-icons/core/assets/regular/chart-bar.svg?raw';
import line from '@phosphor-icons/core/assets/regular/chart-line-up.svg?raw';
import settings from '@phosphor-icons/core/assets/regular/gear-six.svg?raw';
import search from '@phosphor-icons/core/assets/regular/magnifying-glass.svg?raw';
import plus from '@phosphor-icons/core/assets/regular/plus.svg?raw';
import collapse from '@phosphor-icons/core/assets/regular/sidebar-simple.svg?raw';
import book from '@phosphor-icons/core/assets/regular/book-open.svg?raw';
import note from '@phosphor-icons/core/assets/regular/notebook.svg?raw';
import pencil from '@phosphor-icons/core/assets/regular/pencil-simple.svg?raw';
import clock from '@phosphor-icons/core/assets/regular/clock-counter-clockwise.svg?raw';
import user from '@phosphor-icons/core/assets/regular/user-circle.svg?raw';
import arrow from '@phosphor-icons/core/assets/regular/arrow-up-right.svg?raw';
import folder from '@phosphor-icons/core/assets/regular/folder-simple.svg?raw';
import dots from '@phosphor-icons/core/assets/regular/dots-six-vertical.svg?raw';
import more from '@phosphor-icons/core/assets/regular/dots-three.svg?raw';
import sliders from '@phosphor-icons/core/assets/regular/sliders-horizontal.svg?raw';
import left from '@phosphor-icons/core/assets/regular/caret-left.svg?raw';
import right from '@phosphor-icons/core/assets/regular/caret-right.svg?raw';
import device from '@phosphor-icons/core/assets/regular/desktop.svg?raw';
import orbit from '@phosphor-icons/core/assets/regular/planet.svg?raw';
const icons: Record<string, string> = { house: home, 'squares-four': apps, 'check-square': tasks, 'calendar-blank': calendar, 'chart-bar': chart, 'chart-line-up': line, 'gear-six': settings, 'magnifying-glass': search, plus, 'sidebar-simple': collapse, 'book-open': book, notebook: note, 'pencil-simple': pencil, 'clock-counter-clockwise': clock, 'user-circle': user, 'arrow-up-right': arrow, 'folder-simple': folder, 'dots-six-vertical': dots, 'dots-three': more, 'sliders-horizontal': sliders, 'caret-left': left, 'caret-right': right, desktop: device, planet: orbit };
export function icon(name: string) { return `<span class="ws-icon" aria-hidden="true">${Object.hasOwn(icons,name) ? icons[name] : apps}</span>`; }
export function appIcon(id: string) { return /library|bible|french|greek/.test(id) ? 'book-open' : /notes|markdown|manuscript/.test(id) ? 'notebook' : /tms|clean|steady/.test(id) ? 'check-square' : /orrery|sky|earth/.test(id) ? 'planet' : 'squares-four'; }
