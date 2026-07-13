import { PartnerQualityRepository } from "../repositories/partnerQualities.repository";

export class PartnerQualityService {
  private partnerQuality: PartnerQualityRepository;
  constructor() {
    this.partnerQuality = new PartnerQualityRepository();
  }

  async getAll() {
    return await this.partnerQuality.findAll();
  }
}