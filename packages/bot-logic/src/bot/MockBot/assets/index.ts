// @ts-expect-error no typings for assets
import AirplanePng from './airplane.png';
// @ts-expect-error no typings for assets
import BfSquareSvg from './bf_square.svg';
// @ts-expect-error no typings for assets
import BftestMp3 from './bftest.mp3';
// @ts-expect-error no typings for assets
import IndexTs from './index.ts';
// @ts-expect-error no typings for assets
import MsBand1Jpg from './ms-band1.jpg';
// @ts-expect-error no typings for assets
import MsbandMp4 from './msband.mp4';
// @ts-expect-error no typings for assets
import SportsPanthersPng from './sports-panthers.png';
// @ts-expect-error no typings for assets
import SportsSeahawksPng from './sports-seahawks.png';
// @ts-expect-error no typings for assets
import SquareIconGreenPng from './square-icon-green.png';
// @ts-expect-error no typings for assets
import SquareIconPurplePng from './square-icon-purple.png';
// @ts-expect-error no typings for assets
import SquareIconRedPng from './square-icon-red.png';
// @ts-expect-error no typings for assets
import SquareIconPng from './square-icon.png';
// @ts-expect-error no typings for assets
import SurfaceGif from './surface.gif';
// @ts-expect-error no typings for assets
import Surface1Jpg from './surface1.jpg';
// @ts-expect-error no typings for assets
import Surface2Jpg from './surface2.jpg';
// @ts-expect-error no typings for assets
import Surface3Jpg from './surface3.jpg';
// @ts-expect-error no typings for assets
import Surface4Jpg from './surface4.jpg';
// @ts-expect-error no typings for assets
import SurfaceAnimGif from './surface_anim.gif';
// @ts-expect-error no typings for assets
import TestDocx from './test.docx';
// @ts-expect-error no typings for assets
import TestTxt from './test.txt';
// @ts-expect-error no typings for assets
import WeatherPartlyCloudyDayPng from './weather-partly-cloudy-day.png';
// @ts-expect-error no typings for assets
import WeatherPartlyCloudyNightPng from './weather-partly-cloudy-night.png';
// @ts-expect-error no typings for assets
import WeatherRainShowersDayPng from './weather-rain-showers-day.png';
// @ts-expect-error no typings for assets
import WeatherRainShowersNightPng from './weather-rain-showers-night.png';
// @ts-expect-error no typings for assets
import WeatherSunnyPng from './weather-sunny.png';

const assets = {
  './airplane.png': `data:image/png;base64,${AirplanePng}`,
  './bf_square.svg': `data:image/svg+xml;base64,${BfSquareSvg}`,
  './bftest.mp3': `data:audio/mp3;base64,${BftestMp3}`,
  './ms-band1.jpg': `data:image/jpeg;base64,${MsBand1Jpg}`,
  './msband.mp4': `data:video/mp4;base64,${MsbandMp4}`,
  './sports-panthers.png': `data:image/png;base64,${SportsPanthersPng}`,
  './sports-seahawks.png': `data:image/png;base64,${SportsSeahawksPng}`,
  './square-icon-green.png': `data:image/png;base64,${SquareIconGreenPng}`,
  './square-icon-purple.png': `data:image/png;base64,${SquareIconPurplePng}`,
  './square-icon-red.png': `data:image/png;base64,${SquareIconRedPng}`,
  './square-icon.png': `data:image/png;base64,${SquareIconPng}`,
  './surface.gif': `data:image/gif;base64,${SurfaceGif}`,
  './surface1.jpg': `data:image/jpeg;base64,${Surface1Jpg}`,
  './surface2.jpg': `data:image/jpeg;base64,${Surface2Jpg}`,
  './surface3.jpg': `data:image/jpeg;base64,${Surface3Jpg}`,
  './surface4.jpg': `data:image/jpeg;base64,${Surface4Jpg}`,
  './surface_anim.gif': `data:image/gif;base64,${SurfaceAnimGif}`,
  './test.docx': `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${TestDocx}`,
  './test.txt': `data:text/plain;base64,${TestTxt}`,
  './weather-partly-cloudy-day.png': `data:image/png;base64,${WeatherPartlyCloudyDayPng}`,
  './weather-partly-cloudy-night.png': `data:image/png;base64,${WeatherPartlyCloudyNightPng}`,
  './weather-rain-showers-day.png': `data:image/png;base64,${WeatherRainShowersDayPng}`,
  './weather-rain-showers-night.png': `data:image/png;base64,${WeatherRainShowersNightPng}`,
  './weather-sunny.png': `data:image/png;base64,${WeatherSunnyPng}`
};

export default assets;
