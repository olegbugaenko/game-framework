export class Formulas {

    static applyMinMax(val, formula) {
        if (formula.min != null) {
            val = Math.max(formula.min, val);
        }
        if (formula.max != null) {
            val = Math.min(formula.max, val);
        }
        return val;
    }

    static calculateLinearValue(formula, x) {
        let val = formula.B + formula.A * x;
        return this.applyMinMax(val, formula);
    }

    static calculateConst(formula, x) {
        let val = x < 1 ? formula.B : formula.A + formula.B;
        return this.applyMinMax(val, formula);
    }

    static calculateExponentialValue(formula, x) {
        let val = formula.B * Math.pow(formula.A, x) + (formula.C || 0);
        return this.applyMinMax(val, formula);
    }

    static calculatePolyExponential(formula, x) {
        let val = formula.B + formula.A * x * Math.pow(formula.C, x);
        return this.applyMinMax(val, formula);
    }

    static calculateDiminish(formula, x) {
        let val = formula.C + formula.A * formula.B * x * Math.pow(x, formula.diminish ?? 0.25) / (formula.B + x);
        return this.applyMinMax(val, formula);
    }

    static calculateDecreasing(formula, x) {
        let val = formula.B + formula.C * formula.A * x / (formula.A + Math.pow(x, formula.diminish ?? 0.75));
        return this.applyMinMax(val, formula);
    }

    static calculateValue(formula, x) {
        if (formula.type === 0) {
            return Formulas.calculateLinearValue(formula, x);
        } else if (formula.type === 1) {
            return Formulas.calculateExponentialValue(formula, x);
        } else if (formula.type === 2) {
            return Formulas.calculateConst(formula, x);
        } else if (formula.type === 3) {
            return Formulas.calculatePolyExponential(formula, x);
        } else if (formula.type === 4) {
            return Formulas.calculateDiminish(formula, x);
        } else if (formula.type === 5) {
            return Formulas.calculateDecreasing(formula, x);
        } else {
            throw new Error('Invalid formula type: ' + formula.type);
        }
    }

}