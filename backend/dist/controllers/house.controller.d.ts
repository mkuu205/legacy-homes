import { Request, Response } from "express";
export declare class HouseController {
    createHouse(req: Request, res: Response): Promise<void>;
    getAllHouses(req: Request, res: Response): Promise<void>;
    getHouseById(req: Request, res: Response): Promise<void>;
    updateHouse(req: Request, res: Response): Promise<void>;
    lockHouseForBilling(req: Request, res: Response): Promise<void>;
    unlockHouse(req: Request, res: Response): Promise<void>;
    getVacantHouses(req: Request, res: Response): Promise<void>;
    getOccupiedHouses(req: Request, res: Response): Promise<void>;
    deleteHouse(req: Request, res: Response): Promise<void>;
}
declare const _default: HouseController;
export default _default;
//# sourceMappingURL=house.controller.d.ts.map