import type { DirectLineJSBotConnection } from "copilot-studio-direct-to-engine-chat-adapter";

// type WebSpeechPonyfill = {
//   /**
//    * Function to resume `AudioContext` object when called.
//    *
//    * Web Chat will call this function on user gestures to resume suspended `AudioContext`.
//    */
//   resumeAudioContext?: () => Promise<void>;

//   /** Polyfill for Web Speech API `SpeechGrammarList` class. */
//   SpeechGrammarList?: typeof SpeechGrammarList;

//   /** Polyfill for Web Speech API `SpeechRecognition` class. */
//   SpeechRecognition?: typeof SpeechRecognition;

//   /** Polyfill for Web Speech API `speechSynthesis` instance. */
//   speechSynthesis?: SpeechSynthesis;

//   /** Polyfill for Web Speech API `SpeechSynthesisUtterance` class. */
//   SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
// };

export type WebChatAdapters = {
  directLine: DirectLineJSBotConnection;
  webSpeechPonyfill?: any | undefined;
};
