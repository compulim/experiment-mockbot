export default function sleep(durationInMS = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationInMS));
}
