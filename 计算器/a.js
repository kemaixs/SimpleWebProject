/**************************** Lexer Begin ************************/

function Lexer(expression) {
   this.expression = expression;
   this.index = 0;
}
Lexer.prototype.getchar = function() {
   if (this.index < this.expression.length) {
      return this.expression[this.index++];
   }
   else {
      this.index++;
      return -1;
   }
}
Lexer.prototype.ungetchar = function() {
   this.index--;
}
Lexer.prototype.lex_number = function() {
   var c = this.getchar();
   if (c == "0") {
      return this.lex_number0();
   }
   else if("123456789".indexOf(c) != -1) {
      this.ungetchar();
      return this.lex_numberx();
   }
   else {
      this.ungetchar();
      return [false, "number", ""];
   }
}
Lexer.prototype.lex_number0 = function() {
   if (this.getchar() != ".") {
      return;
   }
   var token = "0.";
   while (true) {
      var c = this.getchar();
      if ("0123456789".indexOf(c) == -1) {
         this.ungetchar();
         return [true, "number", token];
      }
      token += c;
   }
}
Lexer.prototype.lex_numberx = function() {
   var token = "";
   while (true) {
      var c = this.getchar();
      if ("0123456789".indexOf(c) == -1) {
         this.ungetchar();
         break;
      }
      token += c;
   }
   if (this.getchar() != ".") {
      this.ungetchar();
      return [true, "number", token];
   }
   token += ".";
   while (true) {
      var c = this.getchar();
      if ("0123456789".indexOf(c) == -1) {
         this.ungetchar();
         return [true, "number", token];
      }
      token += c;
   }
}
Lexer.prototype.lex_id = function() {
   var c = this.getchar();
   if ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_".indexOf(c) == -1) {
      this.ungetchar();
      return [false, "id", ""];
   }
   var token = c;
   while (true) {
      c = this.getchar();
      if ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".indexOf(c) == -1) {
         this.ungetchar();
         return [true, "id", token];
      }
      token += c;
   }
}
Lexer.prototype.lex_sign = function() {
   var c = this.getchar();
   if ("+-*/()^=".indexOf(c) != -1) {
      return [true, "sign", c];
   }
   else {
      this.ungetchar();
      return [false, "sign", ""];
   }
}
Lexer.prototype.lex_eof = function() {
   if (this.getchar() == -1) {
      return [true, "eof", ""];
   }
   else {
      this.ungetchar();
      return [false, "eof", ""];
   }
}
Lexer.prototype.lex_space = function() {
   if (" \n\t".indexOf(this.getchar()) != -1) {
      return [true, "space", ""];
   }
   else {
      this.ungetchar();
      return [false, "space", ""];
   }
}
Lexer.prototype.lex = function() {
   var t;
   while (true) {
      t = this.lex_space();
      if (t[0]) continue;
      t = this.lex_eof();
      if (t[0]) break;
      t = this.lex_number();
      if (t[0]) break;
      t = this.lex_sign();
      if (t[0]) break;
      t = this.lex_id();
      if (t[0]) break;
      return [false, "unknow", "", this.index];
   }
   t.push(this.index);
   return t;
}
Lexer.prototype.getTokens = function() {
   var t;
   var tokens = [];
   while (true) {
      t = this.lex();
      tokens.push(t);
      if (t[0] == false || t[1] == "unknow") {
         throw "词法分析器：错误，位于第" + t[3] + "个字符处：未知的词素或前缀。";
      }
      if (t[1] == "eof") {
         return tokens;
      }
   }
}

/**************************** Lexer End ************************/

/**************************** Parser Begin ************************/

function Parser(lexer) {
   this.tokens = lexer.getTokens();
   this.index = 0;
   this.indexStack = [];
   this.mainStack = [];
   this.errorMsg = "";
}
Parser.prototype.saveIndex = function() {
   this.indexStack.push(this.index);
}
Parser.prototype.unsaveIndex = function() {
   this.indexStack.pop();
}
Parser.prototype.recvIndex = function() {
   this.index = this.indexStack.pop();
}
Parser.prototype.getToken = function() {
   if (this.index < this.tokens.length) {
      return this.tokens[this.index++];
   }
   else {
      this.index++;
      return [true, "eof", ""];
   }
}
Parser.prototype.ungetToken = function() {
   this.index--;
}
Parser.prototype.Expression = function() {
   this.saveIndex();
   if (this.Assign()) {
      this.unsaveIndex();
      return true;
   }
   else {
      this.recvIndex();
      return false;
   }
}
Parser.prototype.Assign = function() {
   this.saveIndex();
   var token1, token2;
   if (!this.AddSub()) {
      this.recvIndex();
      return false;
   }
   while (true) {
      this.unsaveIndex();
      this.saveIndex();
      token1 = this.getToken();
      if (token1[1] == "sign" && token1[2] == "=") {
         if (!this.AddSub()) {
            var tmpToken = this.getToken();
            this.ungetToken();
            this.recvIndex();
            this.errorMsg = "语法分析器：错误，位于第" + tmpToken[3] + "个字符处：二元运算符'='后出现不合法的内容。";
            return false;
         }
         this.mainStack.push(["operator", "="]);
      }
      else {
         this.recvIndex();
         return true;
      }
      this.unsaveIndex();
   }
}
Parser.prototype.AddSub = function() {
   this.saveIndex();
   var token1, token2;
   if (!this.Term()) {
      this.recvIndex();
      return false;
   }
   while (true) {
      this.unsaveIndex();
      this.saveIndex();
      token1 = this.getToken();
      if (token1[1] == "sign" && token1[2] == "+") {
         if (!this.Term()) {
            var tmpToken = this.getToken();
            this.ungetToken();
            this.recvIndex();
            this.errorMsg = "语法分析器：错误，位于第" + tmpToken[3] + "个字符处：二元运算符'+'后出现不合法的内容。";
            return false;
         }
         this.mainStack.push(["operator", "+"]);
      }
      else if (token1[1] == "sign" && token1[2] == "-") {
         if (!this.Term()) {
            var tmpToken = this.getToken();
            this.ungetToken();
            this.recvIndex();
            this.errorMsg = "语法分析器：错误，位于第" + tmpToken[3] + "个字符处：二元运算符'+'后出现不合法的内容。";
            return false;
         }
         this.mainStack.push(["operator", "-"]);
      }
      else {
         this.recvIndex();
         return true;
      }
      this.unsaveIndex();
   }
}
Parser.prototype.Term = function() {
   this.saveIndex();
   var token1, token2;
   if (!this.Pow()) {
      this.recvIndex();
      return false;
   }
   while (true) {
      this.unsaveIndex();
      this.saveIndex();
      token1 = this.getToken();
      if (token1[1] == "sign" && token1[2] == "*") {
         if (!this.Pow()) {
            var tmpToken = this.getToken();
            this.ungetToken();
            this.recvIndex();
            this.errorMsg = "语法分析器：错误，位于第" + tmpToken[3] + "个字符处：二元运算符'*'后出现不合法的内容。";
            return false;
         }
         this.mainStack.push(["operator", "*"]);
      }
      else if (token1[1] == "sign" && token1[2] == "/") {
         if (!this.Pow()) {
            var tmpToken = this.getToken();
            this.ungetToken();
            this.recvIndex();
            this.errorMsg = "语法分析器：错误，位于第" + tmpToken[3] + "个字符处：二元运算符'/'后出现不合法的内容。";
            return false;
         }
         this.mainStack.push(["operator", "/"]);
      }
      else {
         this.recvIndex();
         return true;
      }
      this.unsaveIndex();
   }
}
Parser.prototype.Pow = function() {
   this.saveIndex();
   var token1, token2;
   if (!this.Primary()) {
      this.recvIndex();
      return false;
   }
   while (true) {
      this.unsaveIndex();
      this.saveIndex();
      token1 = this.getToken();
      if (token1[1] == "sign" && token1[2] == "^") {
         if (!this.Primary()) {
            var tmpToken = this.getToken();
            this.ungetToken();
            this.recvIndex();
            this.errorMsg = "语法分析器：错误，位于第" + tmpToken[3] + "个字符处：二元运算符'^'后出现不合法的内容。";
            return false;
         }
         this.mainStack.push(["operator", "^"]);
      }
      else {
         this.recvIndex();
         return true;
      }
      this.unsaveIndex();
   }
}
Parser.prototype.Primary = function() {
   this.saveIndex();
   var token1, token2;
   token1 = this.getToken();
   if (token1[1] == "number") {
      this.mainStack.push(["number", token1[2]]);
      this.unsaveIndex();
      return true;
   }
   else if (token1[1] == "id") {
      this.mainStack.push(["id", token1[2]]);
      this.unsaveIndex();
      return true;
   }
   else if (token1[1] == "sign" && token1[2] == "(") {
      if (this.Expression()) {
         token2 = this.getToken();
         if (token2[1] == "sign" && token2[2] == ")") {
            this.unsaveIndex();
            return true;
         }
         else {
            this.errorMsg = "语法分析器：错误，位于第" + token1[3] +"个字符处：发现未配对的小括号。"
         }
      }
   }
   else if (token1[1] == "sign" && (token1[2] == "+" || token1[2] == "-")) {
      if (this.Expression()) {
         this.unsaveIndex();
         return true;
      }
   }
   this.recvIndex();
   return false;
}

Parser.prototype.FunctionDef = function() {
   
}

/**************************** Parser End ************************/

/****************************Interpreter Begin ************************/
function Interpreter() {
   this.varTable = {"" : 0};
}
Interpreter.prototype.runExpression = function(target) {
   console.log(target);
   var stack = [];
   var inter = this;
   function popVal() {
      var t = stack.pop();
      if (t[0] == "number") {
         return Number(t[1]);
      }
      else if (t[0] == "id") {
         var subtarget = inter.varTable[t[1]];
         if (subtarget != undefined) {
            return Number(subtarget);
         }
         else {
            throw "解释器：错误，尝试引用未定义的变量'" + t[1] + "'。";
         }
      }
      return "";
   }
   function popVar() {
      var t = stack.pop();
      if (t[0] == "id") {
         return t[1];
      }
      else {
         throw "解释器：错误，可能的原因：赋值运算的左值必须为变量。";
      }
   }
   function pushVal(v) {
      stack.push(["number", v]);
   }
   for (var t of target) {
      if (t[0] == "number") {
         stack.push(t);
      }
      else if (t[0] == "id") {
         stack.push(t);
      }
      else if (t[0] == "operator") {
         switch (t[1]) {
            case "+": {
               let a, b;
               a = popVal();
               b = popVal();
               pushVal(b + a);
               break;
            }
            case "-": {
               let a, b;
               a = popVal();
               b = popVal();
               pushVal(b - a);
               break;
            }
            case "*": {
               let a, b;
               a = popVal();
               b = popVal();
               pushVal(b * a);
               break;
            }
            case "/": {
               let a, b;
               a = popVal();
               b = popVal();
               pushVal(b * a);
               break;
            }
            case "^": {
               let a, b;
               a = popVal();
               b = popVal();
               pushVal(Math.pow(b, a));
               break;
            }
            case "=": {
               let a, b;
               a = popVal();
               b = popVar();
               inter.varTable[b] = a;
               pushVal(a);
               break;
            }
         }
      }
   }
   return popVal();
}


/****************************Interpreter End ************************/
