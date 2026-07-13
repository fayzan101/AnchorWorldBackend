import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { PartnerQuality } from "../entities/PartnerQualities.entity";

export class PartnerQualityRepository {
  private repository = AppDataSource.getRepository(PartnerQuality);

  async create(name: string): Promise<PartnerQuality> {
    const hobby = this.repository.create({ name });
    return await this.repository.save(hobby);
  }

  async findById(id: string): Promise<PartnerQuality | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ["users"],
    });
  }

  async findAll(): Promise<PartnerQuality[]> {
    return await this.repository.find();
  }

  async findByIds(ids: string[]): Promise<PartnerQuality[]> {
    return await this.repository.findBy({ id: In(ids) });
  }

  async update(id: string, name: string): Promise<PartnerQuality | null> {
    await this.repository.update(id, { name });
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
