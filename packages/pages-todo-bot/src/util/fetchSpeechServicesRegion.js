export default async function fetchSpeechServicesRegion() {
  const res = await fetch('https://hawo-mockbot4-token-app.blueriver-ce85e8f0.westus.azurecontainerapps.io/api/token/speech/msi', { method: 'POST' })
  const { region } = await res.json();

  return region;
}
