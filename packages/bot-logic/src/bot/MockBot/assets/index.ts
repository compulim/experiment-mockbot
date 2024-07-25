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

const { WEBSITE_SITE_NAME } = parse(
  object({
    WEBSITE_SITE_NAME: optional(string(), 'http://localhost:8000/')
  }),
  process?.env || {}
);

const { WITH_ASSETS } = parse(
  object({
    WITH_ASSETS: optional(boolean(), false)
  }),
  globalThis
);

function buildURL(filename: string, contentType: string, base64: string): string {
  if (WITH_ASSETS) {
    return `data:${contentType};base64,${base64}`;
  }

  const url = new URL(`https://localhost/assets/${filename}`);

  url.hostname = WEBSITE_SITE_NAME;

  return url.toString();
}

const assets = {
  './airplane.png': buildURL('airplane.png', `image/png`, `${AirplanePng}`),
  './bf_square.svg': buildURL('bf_square.svg', `image/svg+xml`, `${BfSquareSvg}`),
  './bftest.mp3': buildURL('bftest.mp3', `audio/mp3`, `${BftestMp3}`),
  './ms-band1.jpg': buildURL('ms-band1.jpg', `image/jpeg`, `${MsBand1Jpg}`),
  './msband.mp4': buildURL('msband.mp4', `video/mp4`, `${MsbandMp4}`),
  './sports-panthers.png': buildURL('sports-panthers.png', `image/png`, `${SportsPanthersPng}`),
  './sports-seahawks.png': buildURL('sports-seahawks.png', `image/png`, `${SportsSeahawksPng}`),
  './square-icon-green.png': buildURL('square-icon-green.png', `image/png`, `${SquareIconGreenPng}`),
  './square-icon-purple.png': buildURL('square-icon-purple.png', `image/png`, `${SquareIconPurplePng}`),
  './square-icon-red.png': buildURL('square-icon-red.png', `image/png`, `${SquareIconRedPng}`),
  './square-icon.png': buildURL('square-icon.png', `image/png`, `${SquareIconPng}`),
  './surface.gif': buildURL('surface.gif', `image/gif`, `${SurfaceGif}`),
  './surface1.jpg': buildURL('surface1.jpg', `image/jpeg`, `${Surface1Jpg}`),
  './surface2.jpg': buildURL('surface2.jpg', `image/jpeg`, `${Surface2Jpg}`),
  './surface3.jpg': buildURL('surface3.jpg', `image/jpeg`, `${Surface3Jpg}`),
  './surface4.jpg': buildURL('surface4.jpg', `image/jpeg`, `${Surface4Jpg}`),
  './surface_anim.gif': buildURL('surface_anim.gif', `image/gif`, `${SurfaceAnimGif}`),
  './test.docx': buildURL(
    'test.docx',
    `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
    `${TestDocx}`
  ),
  './test.txt': buildURL('test.txt', `text/plain`, `${TestTxt}`),
  './weather-partly-cloudy-day.png': buildURL(
    'weather-partly-cloudy-day.png',
    `image/png`,
    `${WeatherPartlyCloudyDayPng}`
  ),
  './weather-partly-cloudy-night.png': buildURL(
    'weather-partly-cloudy-night.png',
    `image/png`,
    `${WeatherPartlyCloudyNightPng}`
  ),
  './weather-rain-showers-day.png': buildURL(
    'weather-rain-showers-day.png',
    `image/png`,
    `${WeatherRainShowersDayPng}`
  ),
  './weather-rain-showers-night.png': buildURL(
    'weather-rain-showers-night.png',
    `image/png`,
    `${WeatherRainShowersNightPng}`
  ),
  './weather-sunny.png': buildURL('weather-sunny.png', `image/png`, `${WeatherSunnyPng}`)
};

export default assets;
