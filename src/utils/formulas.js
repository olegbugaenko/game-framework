export class Formulas {

    static calculateLinearValue(formula, x) {
        return formula.B + formula.A * x;
    }

    static calculateConst(formula, x) {
        return x < 1 ? formula.B : formula.A + formula.B;
    }

    static calculateExponentialValue(formula, x) {
        return formula.B*Math.pow(formula.A, x);
    }

    static calculatePolyExponential(formula, x) {
        return formula.B + formula.A * x * (formula.C ** x);
    }

    static calculateValue(formula, x) {
        if(formula.type === 0) {
            return Formulas.calculateLinearValue(formula, x)
        } else if(formula.type === 1) {
            return Formulas.calculateExponentialValue(formula, x)
        } else if(formula.type === 2) {
            return Formulas.calculateConst(formula, x)
        } else if(formula.type === 3) {
            return Formulas.calculatePolyExponential(formula, x)
        }
    }

}