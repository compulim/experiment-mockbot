import { type Activity } from 'botbuilder';
import { IterableWritableStream } from 'iter-fest';

export default class ClientTurn {
  constructor() {
    this.#currentActivity = undefined;
    this.#writable = new IterableWritableStream<Activity[]>();
    this.#writer = this.#writable.getWriter();

    this.#iterator = this.#writable[Symbol.asyncIterator]();
  }

  #currentActivity: Partial<Activity> | undefined;
  #iterator: AsyncIterator<readonly Activity[]>;
  // #ongoing: PromiseWithResolvers<void> | undefined;
  #writable: IterableWritableStream<readonly Activity[]>;
  #writer: WritableStreamDefaultWriter<readonly Activity[]>;

  get currentActivity() {
    return this.#currentActivity;
  }

  set currentActivity(value) {
    this.#currentActivity = value;
  }

  #whoseTurn: 'bot' | 'user' = 'user';
  #willContinue: boolean = false;

  get willContinue() {
    return this.#willContinue;
  }

  markAsBotTurn(activity: Partial<Activity>) {
    this.#currentActivity = activity;
    this.#whoseTurn = 'bot';
    this.#willContinue = false;
  }

  async markAsUserTurn() {
    this.#willContinue = false;

    this.push(); // Make sure { action: "waiting" } is sent back.

    this.#currentActivity = undefined;
    this.#whoseTurn = 'user';
  }

  markAsWillContinue() {
    if (this.#whoseTurn !== 'bot') {
      throw new Error("Cannot mark turn as will continue because it is not bot's turn.");
    }

    this.#willContinue = true;
  }

  get whoseTurn() {
    return this.#whoseTurn;
  }

  push(...activities: readonly Activity[]): void {
    if (this.#whoseTurn !== 'bot') {
      throw new Error("Cannot push while it is user' turn.");
    }

    this.#writer.write(activities);
  }

  next(): Promise<IteratorResult<readonly Activity[]>> {
    return this.#iterator.next();
  }
}
