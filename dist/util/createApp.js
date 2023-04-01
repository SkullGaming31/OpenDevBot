"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
function createApp() {
    const Port = process.env.PORT;
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use((0, helmet_1.default)());
    app.use((0, morgan_1.default)('tiny'));
    app.use(express_1.default.urlencoded({ extended: false }));
    app.use(express_1.default.json());
    app.use(express_1.default.static('../../public'));
    app.listen(Port, () => { console.log(`Server listening on http://localhost:${Port}`); });
    return app;
}
exports.createApp = createApp;
