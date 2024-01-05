import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { MemberService } from "./member.service";
import { AuthGuard } from "@nestjs/passport";
import { sign } from "jsonwebtoken";
import { JwtService } from "@nestjs/jwt";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateUserDto } from "./dto/updateuser.dto";
@Controller("member")
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private jwtService: JwtService
  ) {}

  @Post("testLogin")
  async testLogin(@Res() res) {
    try {
      const accessToken = await this.memberService.testLogin();
      res.cookie("Authorization", accessToken, {
        httpOnly: false,
        secure: true,
        path: "/",
      });
      res.status(201).send("localLogin ok");
    } catch (error) {
      console.error("Error in localLogin:", error);
      res.status(500).send("Internal Server Error");
    }
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

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleLoginCallback(@Req() req, @Res() res) {
    try {
      const token = this.generateAccessToken(req.user);
      const accessToken = `Bearer ${token}`;
      res.cookie("Authorization", accessToken, {
        httpOnly: false,
        secure: true,
        path: "/",
      });
      res.redirect("http://localhost:3000");
    } catch (error) {
      console.error("Error in googleLoginCallback:", error);
      res.status(500).send("Internal Server Error");
    }
  }

  @Get("kakao/callback")
  @UseGuards(AuthGuard("kakao"))
  async kakaoLoginCallback(@Req() req, @Res() res) {
    try {
      const token = this.generateAccessToken(req.user.user);
      const accessToken = `Bearer ${token}`;
      res.cookie("Authorization", accessToken, {
        httpOnly: false,
        secure: true,
        path: "/",
      });
      res.redirect("http://localhost:3000");
    } catch (error) {
      console.error("Error in kakaoLoginCallback:", error);
      res.status(500).send("Internal Server Error");
    }
  }

  @Post("logout")
  async logout(@Res() res) {
    try {
      res.clearCookie("Authorization", { path: "/" });
      res.status(200).send("Logout successful");
    } catch (e) {
      console.error(e);
    }
  }

  @Patch("update")
  @UseInterceptors(FileInterceptor("photo"))
  async updateUser(
    @Req() req,
    @Res() res,
    @UploadedFile() photo,
    @Body() dto: UpdateUserDto
  ) {
    const token = req.cookies.Authorization;
    console.log(photo);
    console.log(dto);

    const result = await this.memberService.update(token, dto, photo);
    res.send(result);
  }

  @Delete("withdrawal")
  async withdrawalUser(@Req() req, @Res() res) {
    const token = req.cookies.Authorization;
    const result = await this.memberService.withdrawal(token);
    res.send(result);
  }

  @Get()
  async getMember(@Req() req, @Res() res) {
    const token = req.cookies.Authorization;

    const member = await this.memberService.getMember(token);
    res.send(member);
  }
}
