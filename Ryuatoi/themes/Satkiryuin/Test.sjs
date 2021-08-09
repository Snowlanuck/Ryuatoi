[: let theme_name = config["setting"]["config"]["theme"]; :]
<html>
	<head></head>
	<body>
		This is: 
		[:= theme_name :]
		[:- include("1.sjs") :]
	</body>
</html>