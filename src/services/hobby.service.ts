import { HobbyRepository } from "../repositories/hobby.repository";

export class HobbyService {
  private hobbyRepository: HobbyRepository;
  constructor() {
    this.hobbyRepository = new HobbyRepository();
  }

  async getAll() {
    const all = await this.hobbyRepository.findAll();
    // Deduplicate by normalized name (e.g. two "Photography" rows in DB).
    const seen = new Map<string, (typeof all)[number]>();
    for (const hobby of all) {
      const key = (hobby.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, hobby);
    }
    return [...seen.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }
}
