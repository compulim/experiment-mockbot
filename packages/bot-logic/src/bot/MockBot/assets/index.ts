import { boolean, object, optional, parse, string } from 'valibot';

// @ts-ignore no typings for assets
import AirplanePng from './airplane.png';
// @ts-ignore no typings for assets
import BfSquareSvg from './bf_square.svg';
// @ts-ignore no typings for assets
import BftestMp3 from './bftest.mp3';
// @ts-ignore no typings for assets
import MsBand1Jpg from './ms-band1.jpg';
// @ts-ignore no typings for assets
import MsbandMp4 from './msband.mp4';
// @ts-ignore no typings for assets
import SportsPanthersPng from './sports-panthers.png';
// @ts-ignore no typings for assets
import SportsSeahawksPng from './sports-seahawks.png';
// @ts-ignore no typings for assets
import SquareIconGreenPng from './square-icon-green.png';
// @ts-ignore no typings for assets
import SquareIconPurplePng from './square-icon-purple.png';
// @ts-ignore no typings for assets
import SquareIconRedPng from './square-icon-red.png';
// @ts-ignore no typings for assets
import SquareIconPng from './square-icon.png';
// @ts-ignore no typings for assets
import SurfaceGif from './surface.gif';
// @ts-ignore no typings for assets
import Surface1Jpg from './surface1.jpg';
// @ts-ignore no typings for assets
import Surface2Jpg from './surface2.jpg';
// @ts-ignore no typings for assets
import Surface3Jpg from './surface3.jpg';
// @ts-ignore no typings for assets
import Surface4Jpg from './surface4.jpg';
// @ts-ignore no typings for assets
import SurfaceAnimGif from './surface_anim.gif';
// @ts-ignore no typings for assets
import TestDocx from './test.docx';
// @ts-ignore no typings for assets
import TestTxt from './test.txt';
// @ts-ignore no typings for assets
import WeatherPartlyCloudyDayPng from './weather-partly-cloudy-day.png';
// @ts-ignore no typings for assets
import WeatherPartlyCloudyNightPng from './weather-partly-cloudy-night.png';
// @ts-ignore no typings for assets
import WeatherRainShowersDayPng from './weather-rain-showers-day.png';
// @ts-ignore no typings for assets
import WeatherRainShowersNightPng from './weather-rain-showers-night.png';
// @ts-ignore no typings for assets
import WeatherSunnyPng from './weather-sunny.png';

declare global {
  // Defined in tsup.config.js.
  const WITH_ASSETS: boolean | undefined;
}

const { WEBSITE_HOSTNAME } = parse(
  object({
    WEBSITE_HOSTNAME: optional(string(), 'http://localhost:8000/')
  }),
  process?.env || {}
);

const { WITH_ASSETS: withAssets } = parse(
  object({
    WITH_ASSETS: optional(boolean(), false)
  }),
  { WITH_ASSETS }
);

function buildURL(contentType: string, base64OrPath: string): string {
  if (withAssets) {
    return `data:${contentType};base64,${base64OrPath}`;
  }

  const url = new URL(`https://localhost/assets/${base64OrPath}`);

  url.hostname = WEBSITE_HOSTNAME;

  return url.toString();
}

const assets = {
  './airplane.png': buildURL(`image/png`, `${AirplanePng}`),
  './bf_square.svg': buildURL(`image/svg+xml`, `${BfSquareSvg}`),
  './bftest.mp3': buildURL(`audio/mp3`, `${BftestMp3}`),
  './ms-band1.jpg': buildURL(`image/jpeg`, `${MsBand1Jpg}`),
  './msband.mp4': buildURL(`video/mp4`, `${MsbandMp4}`),
  './sports-panthers.png': buildURL(`image/png`, `${SportsPanthersPng}`),
  './sports-seahawks.png': buildURL(`image/png`, `${SportsSeahawksPng}`),
  './square-icon-green.png': buildURL(`image/png`, `${SquareIconGreenPng}`),
  './square-icon-purple.png': buildURL(`image/png`, `${SquareIconPurplePng}`),
  './square-icon-red.png': buildURL(`image/png`, `${SquareIconRedPng}`),
  './square-icon.png': buildURL(`image/png`, `${SquareIconPng}`),
  './surface.gif': buildURL(`image/gif`, `${SurfaceGif}`),
  './surface1.jpg': buildURL(`image/jpeg`, `${Surface1Jpg}`),
  './surface2.jpg': buildURL(`image/jpeg`, `${Surface2Jpg}`),
  './surface3.jpg': buildURL(`image/jpeg`, `${Surface3Jpg}`),
  './surface4.jpg': buildURL(`image/jpeg`, `${Surface4Jpg}`),
  './surface_anim.gif': buildURL(`image/gif`, `${SurfaceAnimGif}`),
  './test.docx': buildURL(`application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `${TestDocx}`),
  './test.txt': buildURL(`text/plain`, `${TestTxt}`),
  './weather-partly-cloudy-day.png': buildURL(`image/png`, `${WeatherPartlyCloudyDayPng}`),
  './weather-partly-cloudy-night.png': buildURL(`image/png`, `${WeatherPartlyCloudyNightPng}`),
  './weather-rain-showers-day.png': buildURL(`image/png`, `${WeatherRainShowersDayPng}`),
  './weather-rain-showers-night.png': buildURL(`image/png`, `${WeatherRainShowersNightPng}`),
  './weather-sunny.png': buildURL(`image/png`, `${WeatherSunnyPng}`)
};

export default assets;
