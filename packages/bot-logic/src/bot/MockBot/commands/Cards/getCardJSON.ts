import ArabicGreeting from './1.0/ArabicGreeting.js';
import BingSports from './1.0/BingSports.js';
import Breakfast from './1.0/Breakfast.js';
import CalendarReminder from './1.0/CalendarReminder.js';
import FlightTracking from './1.0/FlightTracking.js';
import Inputs from './1.0/Inputs.js';
import Markdown from './1.0/Markdown.js';
import OrderedList from './1.0/OrderedList.js';
import Restaurant from './1.0/Restaurant.js';
import Review from './1.0/Review.js';
import RichMessage from './1.0/RichMessage.js';
import SportsClub from './1.0/SportsClub.js';
import TextBlockStyle from './1.0/TextBlockStyle.js';
import UnorderedList from './1.0/UnorderedList.js';
import Weather from './1.0/Weather.js';
import ProductVideo from './1.1/ProductVideo.js';
import ActionStyles from './1.2/ActionStyles.js';
import ContainerStyles from './1.2/ContainerStyles.js';
import Repro3560 from './1.2/Repro3560.js';
import Repro3617 from './1.2/Repro3617.js';
import ReproParseError from './1.2/ReproParseError.js';
import Agenda from './1.3/Agenda.js';
import CardWizard from './1.3/CardWizard.js';
import Broken from './Broken.js';
import FlightUpdate from './FlightUpdate.js';
import Simple from './Simple.js';

export default function getCardJSON(name: string = ''): any {
  switch (name.trim().toLowerCase()) {
    case 'agenda':
      return Agenda();

    case 'actionstyles':
      return ActionStyles();

    case 'bingsports':
    case 'sports':
      return BingSports();

    case 'breakfast':
      return Breakfast();

    case 'broken':
      return Broken();

    case 'broken:1':
    case 'broken:lang':
      return Broken('1');

    case 'calendarreminder':
    case 'calendar':
    case 'reminder':
      return CalendarReminder();

    case 'cardwizard':
    case 'wizard':
      return CardWizard();

    case 'containerstyles':
      return ContainerStyles();

    case 'flight':
    case 'flightupdate':
      return FlightUpdate();

    case 'flighttracking':
      return FlightTracking();

    case 'arabicgreeting':
    case 'rtlgreeting':
    case 'رحب بالقارئ':
      return ArabicGreeting();

    case 'input':
    case 'inputs':
      return Inputs();

    case 'markdown':
      return Markdown();

    case 'ol':
      return OrderedList();

    case 'productvideo':
    case 'product video':
    case 'pv':
      return ProductVideo();

    case 'restaurant':
      return Restaurant();

    case 'review':
      return Review();

    case 'richmessage':
      return RichMessage();

    case 'simple':
      return Simple();

    case 'sportsclub':
      return SportsClub();

    case 'textblockstyle':
    case 'textstyle':
      return TextBlockStyle();

    case 'ul':
      return UnorderedList();

    case 'weather':
      return Weather();

    case '3560':
      return Repro3560();

    case '3617':
      return Repro3617();

    case 'parse:error':
      return ReproParseError();
  }
}
