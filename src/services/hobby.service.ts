import { HobbyRepository } from "../repositories/hobby.repository";

export class HobbyService {
  private hobbyRepository: HobbyRepository;
  constructor() {
    this.hobbyRepository = new HobbyRepository();
  }

  async getAll() {
    return await this.hobbyRepository.findAll();
  }
}
