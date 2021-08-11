[: let theme_name = config["setting"]["config"]["theme"]; :]
<html>
	<head>
		<style>
			@import url(main.css);
		</style>
	</head>
	<body>
		This is: 
		[:= theme_name :]
		[:- include("1.sjs") :]
	</body>
</html>