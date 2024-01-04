import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Member } from "./entity/member.entity";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import { JwtService } from "@nestjs/jwt";
import { UpdateUserDto } from "./dto/updateuser.dto";
import { Storage } from "@google-cloud/storage";

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    private jwtService: JwtService,
    private storage: Storage
  ) {
    this.storage = new Storage({
      projectId: "toonmoa",
      keyFilename: "./toonmoa-3bbc9ada2044.json",
    });
  }
  private readonly bucketName = process.env.GCP_BUCKETNAME;

  async testLogin() {
    try {
      const member = await this.memberRepository.findOne({
        where: { email: "hansyooni11@gmail.com" },
      });
      const token = await this.login(member);
      const accessToken = `Bearer ${token}`;
      return accessToken;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async login(user: Member): Promise<string> {
    const payload = { user: { email: user.email } };
    const accesstoken = this.generateAccessToken(payload);
    return accesstoken;
  }

  private generateAccessToken(user: any): string {
    const secretKey = process.env.ACCESS_TOKEN_PRIVATE_KEY;
    const expiresIn = "24h";
    const accessToken = this.jwtService.sign(
      { user },
      { expiresIn, secret: secretKey }
    );
    return accessToken;
  }

  async findByEmailOrSave(email, photo, name): Promise<Member> {
    const isUser = await this.getUser(email);
    if (!isUser) {
      const newUser = await this.memberRepository.save({
        email,
        photo,
        name,
      });
      return newUser;
    }
    return isUser;
  }

  async getUser(email: string): Promise<Member> {
    const user = await this.memberRepository.findOne({
      where: { email: email },
    });
    return user;
  }

  async update(token, dto: UpdateUserDto, photo) {
    try {
      console.log(dto.name, dto.phonenum);
      console.log(photo);

      const decodeToken = await this.decodeToken(token);
      const { user } = decodeToken;

      const member = await this.getUser(user.email);
      console.log(member);

      if (!member) return "잘못된 유저정보 입니다.";
      if (dto.name) member.name = dto.name;
      if (dto.phonenum) member.phonenum = dto.phonenum;
      if (photo) {
        this.imageUpload(photo, member);
      }
      const updateBuyer = await this.memberRepository.save(member);
      return updateBuyer;
    } catch (e) {
      return e;
    }
  }

  async imageUpload(photo, buyer) {
    const fileName = `${Date.now()}_${randomUUID()}`;
    const bucket = this.storage.bucket(this.bucketName);
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream();

    await new Promise((resolve, reject) => {
      blobStream.on("error", (error) => {
        throw new Error(`Unable to upload profile picture: ${error}`);
      });

      blobStream.on("finish", async () => {
        const photoUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
        buyer.photo = photoUrl;
      });

      blobStream.end(photo.buffer);
    });
  }

  async withdrawal(token) {
    const decodeToken = await this.decodeToken(token);
    const { user } = decodeToken;

    const member = await this.getUser(user.email);
    if (!member) return "잘못된 유저정보입니다.";

    const deleteResult = await this.memberRepository.delete({
      id: member.id,
    });
    if (deleteResult.affected === 1) {
      return "삭제 성공!";
    } else {
      return "삭제 실패";
    }
  }

  async getMember(token) {
    const decodeToken = await this.decodeToken(token);
    const { user } = decodeToken;

    const member = await this.getUser(user.email);
    if (!member) return "잘못된 유저정보입니다.";
    return member;
  }

  async decodeToken(token) {
    try {
      const verifiedToken = token.split(" ")[1];
      const decodeToken = this.jwtService.verify(verifiedToken, {
        secret: process.env.ACCESS_TOKEN_PRIVATE_KEY,
      });
      return decodeToken;
    } catch (e) {
      console.error("decodeToken Error:", e);
      return null;
    }
  }
}
