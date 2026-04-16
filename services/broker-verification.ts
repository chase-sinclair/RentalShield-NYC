export async function verifyBroker(brokerName?: string, company?: string) {
  // TODO: Connect to NY license lookup source and improve entity matching.
  if (!brokerName && !company) {
    return {
      status: "skipped" as const,
      matched: false,
      notes: ["Not enough broker information was supplied to verify identity."],
    };
  }

  return {
    status: "mock" as const,
    matched: false,
    confidence: 0.34,
    notes: ["Broker verification is scaffolded and awaiting live license-source integration."],
  };
}
